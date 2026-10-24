import { knowledge } from "../../data/knowledge";
import { isExtension } from "../../lib/extension";
import { SEMANTIC_CACHE } from "./semantic-config";
export type SemanticState = {
  state: "disabled" | "loading" | "ready" | "error";
  detail: string;
  progress?: number;
};
type Scores = { id: string; score: number }[];
export class SemanticRuntime {
  private worker?: Worker;
  private listeners = new Set<() => void>();
  private state: SemanticState = {
    state: "disabled",
    detail: "Optional model not loaded. Lexical matching is available.",
  };
  private pending = new Map<
    number,
    { resolve: (s: Scores) => void; reject: (e: Error) => void }
  >();
  private sequence = 0;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(
    private factory = () =>
      new Worker(new URL("./semantic-worker.ts", import.meta.url), {
        type: "module",
      }),
  ) {}
  subscribe = (f: () => void) => {
    this.listeners.add(f);
    return () => {
      this.listeners.delete(f);
    };
  };
  getSnapshot = () => this.state;
  private update(state: SemanticState) {
    this.state = state;
    this.listeners.forEach((f) => f());
  }
  initialize(consent: boolean) {
    if (!consent || this.worker) return;
    if (import.meta.env.MODE === "extension" || isExtension()) {
      this.update({
        state: "error",
        detail:
          "Enhanced understanding is website-only. Gamma’s built-in matching remains available.",
      });
      return;
    }
    this.update({
      state: "loading",
      detail: "Loading the optional model and local index…",
    });
    try {
      const worker = this.factory();
      this.worker = worker;
      this.timer = setTimeout(
        () =>
          this.fail(
            "Setup timed out. Retry when connectivity and storage are available.",
          ),
        10 * 60_000,
      );
      worker.onerror = () =>
        this.fail(
          "Semantic worker failed. Built-in matching remains available.",
        );
      worker.onmessage = ({ data }) => {
        if (worker !== this.worker) return;
        if (data.type === "progress")
          this.update({
            state: "loading",
            detail: data.detail,
            progress: data.progress,
          });
        if (data.type === "ready") {
          clearTimeout(this.timer);
          this.update({
            state: "ready",
            detail: "Local semantic matching is ready (experimental).",
          });
        }
        if (data.type === "result") {
          this.pending.get(data.id)?.resolve(data.scores);
          this.pending.delete(data.id);
        }
        if (data.type === "error") this.fail(data.detail);
      };
      worker.postMessage({
        type: "init",
        records: knowledge.map((k) => ({
          id: k.id,
          text: [k.title, ...k.phrases].join(". "),
        })),
      });
    } catch {
      this.fail(
        "Unable to start the optional worker. Use built-in matching or retry setup.",
      );
    }
  }
  private fail(detail: string) {
    this.disable();
    this.update({ state: "error", detail });
  }
  disable = () => {
    clearTimeout(this.timer);
    this.worker?.terminate();
    this.worker = undefined;
    for (const p of this.pending.values())
      p.reject(new Error("Semantic operation cancelled"));
    this.pending.clear();
    this.update({
      state: "disabled",
      detail: "Enhanced understanding is off. Cached assets are retained.",
    });
  };
  async remove() {
    this.disable();
    if (typeof caches !== "undefined") await caches.delete(SEMANTIC_CACHE);
  }
  async query(text: string, signal?: AbortSignal): Promise<Scores> {
    if (this.state.state !== "ready" || !this.worker) return [];
    signal?.throwIfAborted();
    const id = ++this.sequence;
    return new Promise<Scores>((resolve, reject) => {
      const finish = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        this.pending.delete(id);
      };
      // Inference itself is not interruptible; termination cancels it and preserves caches.
      const abort = () => {
        finish();
        this.disable();
        reject(new DOMException("Stopped", "AbortError"));
      };
      const timer = setTimeout(() => {
        finish();
        this.disable();
        resolve([]);
      }, 8000);
      this.pending.set(id, {
        resolve: (scores) => {
          finish();
          resolve(scores);
        },
        reject: (e) => {
          finish();
          reject(e);
        },
      });
      signal?.addEventListener("abort", abort, { once: true });
      this.worker!.postMessage({ type: "query", id, text });
    });
  }
}
export const semantic = new SemanticRuntime();
