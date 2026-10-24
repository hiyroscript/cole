import {
  WebWorkerMLCEngine,
  prebuiltAppConfig,
  hasModelInCache,
  deleteModelAllInfoInCache,
} from "@mlc-ai/web-llm";
import { MODEL_ID, CONTEXT_SIZE } from "./model-config";
import type { Transport, Generation } from "./types";
export const record = prebuiltAppConfig.model_list.find(
  (m) => m.model_id === MODEL_ID,
);
if (!record || record.overrides?.context_window_size !== CONTEXT_SIZE)
  throw new Error("Incompatible WebLLM model catalog");
// Use the verified catalog library, never guess a compiled WASM URL.
const appConfig = { ...prebuiltAppConfig, model_list: [record] };
export const cached = () => hasModelInCache(MODEL_ID, appConfig);
export const removeCache = () => deleteModelAllInfoInCache(MODEL_ID, appConfig);
export function createTransport(): Transport {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
  const engine = new WebWorkerMLCEngine(worker, { appConfig });
  let rejectFailure: (e: Error) => void = () => {};
  const failure = new Promise<never>((_, reject) => {
    rejectFailure = reject;
  });
  void failure.catch(() => {});
  worker.addEventListener("error", () =>
    rejectFailure(
      new Error("Madon worker failed. Unload and initialize again."),
    ),
  );
  worker.addEventListener("messageerror", () =>
    rejectFailure(new Error("Madon worker message could not be decoded.")),
  );
  return {
    initialize(progress) {
      engine.setInitProgressCallback(progress);
      return Promise.race([
        engine.reload(MODEL_ID, { context_window_size: CONTEXT_SIZE }),
        failure,
      ]);
    },
    async *generate(request: Generation) {
      // Reset KV state; the explicitly bounded role history is the sole source of context.
      await Promise.race([engine.resetChat(), failure]);
      const output = await Promise.race([
        engine.chat.completions.create({
          messages: request.messages,
          stream: true,
          max_tokens: request.maxTokens,
          temperature: request.thinking ? 0.6 : 0.7,
          top_p: request.thinking ? 0.95 : 0.8,
          extra_body: { enable_thinking: request.thinking },
        }),
        failure,
      ]);
      const iterator = output[Symbol.asyncIterator]();
      try {
        while (true) {
          const next = await Promise.race([iterator.next(), failure]);
          if (next.done) break;
          const choice = next.value.choices[0];
          if (choice?.delta.content) yield choice.delta.content;
        }
      } finally {
        await Promise.race([iterator.return?.(), failure]).catch(() => {});
      }
    },
    interrupt() {
      engine.interruptGenerate();
    },
    dispose() {
      worker.terminate();
      rejectFailure(new Error("Madon worker was unloaded."));
    },
  };
}
