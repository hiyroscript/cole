import { checkCapabilities, type Capability } from "./capabilities";
import { AnswerParser } from "./stream-parser";
import type { Snapshot, Transport, Generation } from "./types";
import { isExtension } from "../../lib/extension";
const initial: Snapshot = {
  state: "not-initialized",
  detail: "Download required. No model is loaded.",
};
type Dependencies = {
  capability: () => Promise<Capability>;
  transport: () => Promise<Transport>;
  cache: () => Promise<boolean>;
  remove: () => Promise<void>;
};
const dependencies: Dependencies = {
  capability: checkCapabilities,
  transport: async () => {
    if (import.meta.env.MODE === "extension")
      throw new Error("Website-only runtime");
    return (await import("./transport")).createTransport();
  },
  cache: async () => {
    if (import.meta.env.MODE === "extension") return false;
    return (await import("./transport")).cached();
  },
  remove: async () => {
    if (import.meta.env.MODE === "extension") return;
    return (await import("./transport")).removeCache();
  },
};
export class MadonRuntime {
  private snapshot = initial;
  private listeners = new Set<() => void>();
  private transport?: Transport;
  private epoch = 0;
  private pending?: Promise<void>;
  private removing = false;
  private rejectOperation?: (error: Error) => void;
  constructor(private deps = dependencies) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(value: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, progress: undefined, ...value };
    this.listeners.forEach((f) => f());
  }
  private fail(error: unknown) {
    const technical = error instanceof Error ? error.message : String(error);
    const state = /memory|allocation|out of memory/i.test(technical)
      ? "insufficient-memory"
      : /cache|quota|storage/i.test(technical)
        ? "cache-unavailable"
        : "error";
    this.transport?.dispose();
    this.transport = undefined;
    this.update({
      state,
      technical,
      detail:
        state === "insufficient-memory"
          ? "Madon ran out of graphics memory. Close other GPU-heavy tabs and retry, or switch to Gamma."
          : state === "cache-unavailable"
            ? "Model storage is unavailable or full. Free site storage, then explicitly retry setup."
            : "Madon could not complete this operation. Retry initialization or switch to Gamma. Your conversation is preserved.",
    });
  }
  async check() {
    if (this.pending || this.transport) return;
    const epoch = ++this.epoch;
    this.update({
      state: "checking",
      detail: "Checking WebGPU compatibility…",
      technical: undefined,
    });
    try {
      const result = await this.deps.capability();
      if (epoch !== this.epoch) return;
      this.update({
        ...result,
        state: result.supported ? "download-ready" : "unsupported",
      });
    } catch (e) {
      if (epoch === this.epoch) this.fail(e);
    }
  }
  initialize() {
    if (this.removing) return Promise.resolve();
    if (this.pending) return this.pending;
    if (this.snapshot.state === "ready" || this.snapshot.state === "generating")
      return Promise.resolve();
    const epoch = ++this.epoch;
    let timer: ReturnType<typeof setTimeout>;
    const interrupted = new Promise<never>((_, reject) => {
      this.rejectOperation = reject;
      timer = setTimeout(
        () =>
          reject(
            new Error(
              "Model initialization timed out. Check the connection and retry.",
            ),
          ),
        15 * 60_000,
      );
    });
    const work = async () => {
      this.update({
        state: "checking",
        detail: "Checking compatibility…",
        technical: undefined,
      });
      const c = await this.deps.capability();
      if (epoch !== this.epoch) return;
      if (!c.supported) {
        this.update({ ...c, state: "unsupported" });
        return;
      }
      this.update({
        ...c,
        state: "loading",
        detail: "Checking cached model assets…",
      });
      const cached = await this.deps.cache();
      if (epoch !== this.epoch) return;
      this.update({
        cached,
        state: cached ? "loading" : "downloading",
        detail: cached
          ? "Loading cached assets; missing files may download with your setup permission."
          : "Downloading model assets…",
      });
      const transport = await this.deps.transport();
      if (epoch !== this.epoch) {
        transport.dispose();
        return;
      }
      this.transport = transport;
      await transport.initialize((p) => {
        if (epoch === this.epoch)
          this.update({
            state: /fetch|download/i.test(p.text) ? "downloading" : "loading",
            detail: p.text,
            progress: Number.isFinite(p.progress)
              ? Math.max(0, Math.min(1, p.progress))
              : undefined,
          });
      });
      const retained = await this.deps.cache().catch(() => undefined);
      if (epoch === this.epoch)
        this.update({
          state: "ready",
          detail:
            "Madon is initialized and ready. Inference runs on this device.",
          cached: retained,
        });
    };
    this.pending = Promise.race([work(), interrupted])
      .catch((e) => {
        if (epoch === this.epoch) {
          this.epoch++;
          this.fail(e);
        }
      })
      .finally(() => {
        clearTimeout(timer);
        this.pending = undefined;
        this.rejectOperation = undefined;
      });
    return this.pending;
  }
  unload = () => {
    this.epoch++;
    this.transport?.interrupt();
    this.transport?.dispose();
    this.transport = undefined;
    this.rejectOperation?.(new Error("Model setup cancelled."));
    this.update({
      state: "not-initialized",
      detail: "Model unloaded. Cached files, if present, are retained.",
    });
  };
  async remove() {
    if (this.removing) return false;
    this.unload();
    if (isExtension()) return true;
    this.removing = true;
    this.update({ state: "loading", detail: "Removing Madon cached assets…" });
    try {
      await this.deps.remove();
      this.update({
        state: "not-initialized",
        cached: false,
        detail:
          "Madon’s cached model assets were removed. Other caches were preserved.",
      });
      return true;
    } catch (e) {
      this.fail(e);
      return false;
    } finally {
      this.removing = false;
    }
  }
  async generate(
    request: Generation,
    signal: AbortSignal,
    onText: (text: string) => void,
  ) {
    if (this.snapshot.state !== "ready" || !this.transport)
      throw new Error("Set up Madon before sending a message.");
    if (signal.aborted) return "";
    const transport = this.transport,
      epoch = this.epoch,
      parser = new AnswerParser();
    this.update({
      state: "generating",
      detail: request.thinking
        ? "Analyzing the request"
        : "Preparing an answer",
    });
    let cancelTimer: ReturnType<typeof setTimeout> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let rejectWait: (e: Error) => void = () => {};
    const failed = new Promise<never>((_, reject) => {
      rejectWait = reject;
    });
    void failed.catch(() => {});
    const cancel = () => {
      transport.interrupt();
      this.update({ state: "cancelling", detail: "Stopping inference…" });
      cancelTimer = setTimeout(() => {
        transport.dispose();
        if (this.transport === transport) this.transport = undefined;
        rejectWait(
          new Error("Generation stopped; reinitialize Madon to continue."),
        );
      }, 5000);
    };
    const watchdog = () => {
      clearTimeout(timeout);
      timeout = setTimeout(
        () =>
          rejectWait(
            new Error("GPU generation stalled. Retry initialization."),
          ),
        120_000,
      );
    };
    signal.addEventListener("abort", cancel, { once: true });
    watchdog();
    const iterator = transport.generate(request)[Symbol.asyncIterator]();
    try {
      let last = 0;
      while (true) {
        const next = await Promise.race([iterator.next(), failed]);
        if (next.done || signal.aborted || epoch !== this.epoch) break;
        watchdog();
        const text = parser.push(next.value);
        if (Date.now() - last >= 40 && text) {
          onText(text);
          last = Date.now();
        }
      }
      const text = parser.finish();
      if (!signal.aborted && !text)
        throw new Error(
          "The model reached its output limit without a final answer. Try Thinking Off or a shorter question.",
        );
      if (epoch === this.epoch) onText(text);
      return text;
    } catch (e) {
      if (signal.aborted) {
        const text = parser.finish();
        if (epoch === this.epoch) onText(text);
        return text;
      }
      if (epoch === this.epoch) this.fail(e);
      throw e;
    } finally {
      signal.removeEventListener("abort", cancel);
      try {
        await Promise.race([iterator.return?.(), failed]);
      } catch {
        /* worker already failed or was terminated */
      }
      clearTimeout(cancelTimer);
      clearTimeout(timeout);
      if (
        epoch === this.epoch &&
        ["generating", "cancelling"].includes(this.snapshot.state)
      )
        this.update({
          state: this.transport ? "ready" : "not-initialized",
          detail: this.transport
            ? "Madon is ready."
            : "Generation stopped. Initialize Madon again to continue.",
        });
    }
  }
}
export const madon = new MadonRuntime();
