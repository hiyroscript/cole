import { isExtension } from "../../lib/extension";
import { DEEP_CACHE, validDeepInput, type DeepInput } from "./deep-config";
type State = {
  state: "disabled" | "loading" | "ready" | "generating" | "error";
  detail: string;
  progress?: number;
};
export class DeepRuntime {
  private state: State = {
    state: "disabled",
    detail: "Optional Gamma Deep Mode is off. Core works without it.",
  };
  private listeners = new Set<() => void>();
  private worker?: Worker;
  private session = 0;
  private cacheComplete = true;
  private pending?: {
    resolve: (value: { text: string; ms: number }) => void;
    reject: (error: Error) => void;
    cleanup: () => void;
  };
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () => this.state;
  private set(state: State) {
    this.state = state;
    for (const fn of this.listeners) fn();
  }
  private stop(error: Error) {
    this.session++;
    this.worker?.terminate();
    this.worker = undefined;
    const pending = this.pending;
    this.pending = undefined;
    pending?.cleanup();
    pending?.reject(error);
  }
  disable() {
    this.stop(new DOMException("Local generation cancelled", "AbortError"));
    this.set({
      state: "disabled",
      detail: "Gamma Deep Mode is off. Cached model data is retained.",
    });
  }
  async remove() {
    this.disable();
    if (typeof caches !== "undefined") await caches.delete(DEEP_CACHE);
    this.set({
      state: "disabled",
      detail:
        "Gamma Deep Mode data removed. Other models and conversations are unchanged.",
    });
  }
  async initialize(consent: boolean): Promise<void> {
    if (!consent) throw Error("Explicit model download consent is required.");
    if (isExtension() || import.meta.env.MODE === "extension")
      throw Error("Gamma Deep Mode is website-only; this extension uses Core.");
    if (this.state.state === "loading")
      throw Error("Model setup is already running.");
    if (this.state.state === "ready" || this.state.state === "generating")
      return;
    this.stop(Error("Previous model session replaced."));
    const session = this.session;
    this.set({
      state: "loading",
      detail: "Loading the optional local CPU model…",
    });
    try {
      this.worker = new Worker(new URL("./deep-worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker.onerror = () => {
        if (session !== this.session) return;
        this.fail(
          "The local generation worker failed. Core remains available.",
        );
      };
      this.worker.onmessage = ({ data }) => {
        if (session !== this.session) return;
        if (!data || typeof data !== "object") {
          this.fail("Invalid model worker response.");
          return;
        }
        if (data.type === "progress")
          this.set({
            state: "loading",
            detail: String(data.detail).slice(0, 300),
            progress:
              typeof data.progress === "number" &&
              Number.isFinite(data.progress)
                ? Math.min(1, Math.max(0, data.progress))
                : undefined,
          });
        else if (data.type === "generating")
          this.set({
            state: "generating",
            detail: `Generated ${Number(data.characters) || 0} characters locally…`,
          });
        else if (data.type === "ready" || data.type === "result") {
          if (
            data.type === "result" &&
            (typeof data.text !== "string" ||
              data.text.length > 10000 ||
              typeof data.ms !== "number" ||
              !Number.isFinite(data.ms))
          ) {
            this.fail("Invalid model worker response.");
            return;
          }
          const pending = this.pending;
          this.pending = undefined;
          pending?.cleanup();
          if (data.type === "ready")
            this.cacheComplete = data.cacheComplete !== false;
          this.set({
            state: "ready",
            detail: !this.cacheComplete
              ? "Gamma Deep Mode is ready. Some files could not be cached; offline setup may fail."
              : "Gamma Deep Mode is ready (experimental CPU generation).",
          });
          if (data.type === "ready") pending?.resolve({ text: "", ms: 0 });
          else pending?.resolve({ text: data.text, ms: data.ms });
        } else if (data.type === "error")
          this.fail(String(data.detail).slice(0, 500));
      };
      await this.request({ type: "init" }, 600000);
    } catch (error) {
      if (session === this.session && this.state.state !== "disabled")
        this.set({
          state: "error",
          detail:
            error instanceof Error ? error.message : "Model setup failed.",
        });
      throw error;
    }
  }
  private fail(detail: string) {
    this.stop(Error(detail));
    this.set({ state: "error", detail });
  }
  private request(
    message: unknown,
    timeout: number,
    signal?: AbortSignal,
  ): Promise<{ text: string; ms: number }> {
    signal?.throwIfAborted();
    if (!this.worker || this.pending)
      return Promise.reject(Error("Model is unavailable or busy."));
    return new Promise((resolve, reject) => {
      const abort = () => {
        this.disable();
      };
      const timer = setTimeout(
        () => this.fail("Local model timed out. Retry setup or use Core."),
        timeout,
      );
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      };
      this.pending = { resolve, reject, cleanup };
      signal?.addEventListener("abort", abort, { once: true });
      try {
        this.worker!.postMessage(message);
      } catch (error) {
        this.fail(
          error instanceof Error
            ? error.message
            : "Could not contact the model worker.",
        );
      }
    });
  }
  async generate(input: DeepInput, signal?: AbortSignal) {
    signal?.throwIfAborted();
    if (!validDeepInput(input))
      throw Error("Invalid or excessive model evidence.");
    if (this.state.state !== "ready")
      throw Error(
        "Initialize Gamma Deep Mode in Settings → Assistant setup first.",
      );
    this.set({
      state: "generating",
      detail: "Generating a local draft from the selected evidence…",
    });
    return this.request({ type: "generate", input }, 120000, signal);
  }
}
export const deep = new DeepRuntime();
