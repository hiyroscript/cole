/// <reference lib="webworker" />
import {
  pipeline,
  env,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import {
  SEMANTIC_MODEL,
  SEMANTIC_REVISION,
  SEMANTIC_CACHE,
  SEMANTIC_WEIGHT_SHA256,
  DIMENSIONS,
  validIndex,
  reusableVectors,
  type SemanticIndex,
} from "./semantic-config";
const scope = self as unknown as DedicatedWorkerGlobalScope;
env.allowLocalModels = false;
env.useBrowserCache = false;
env.useCustomCache = true;
// Vite bundles JS; the pinned runtime WASM is copied into the website build.
env.backends.onnx.wasm!.wasmPaths = new URL("../", import.meta.url).href;
env.backends.onnx.wasm!.numThreads = 1;
const cache = () => caches.open(SEMANTIC_CACHE);
env.customCache = {
  match: async (key: string) => (await cache()).match(key),
  put: async (key: string, response: Response) => {
    if (String(key).endsWith("model_quantized.onnx")) {
      const hash = await crypto.subtle.digest(
        "SHA-256",
        await response.clone().arrayBuffer(),
      );
      const hex = [...new Uint8Array(hash)]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      if (hex !== SEMANTIC_WEIGHT_SHA256)
        throw new Error("Embedding artifact checksum mismatch");
    }
    await (await cache()).put(key, response);
  },
};
const createExtractor = pipeline as unknown as (
  task: "feature-extraction",
  model: string,
  options: {
    revision: string;
    dtype: "q8";
    device: "wasm";
    progress_callback: (p: {
      status: string;
      file?: string;
      progress?: number;
    }) => void;
  },
) => Promise<FeatureExtractionPipeline>;
let extractor: FeatureExtractionPipeline;
let index: SemanticIndex;
async function embed(text: string) {
  const result = await extractor(text, { pooling: "mean", normalize: true });
  const vector = Array.from(result.data as Float32Array);
  if (vector.length !== DIMENSIONS || !vector.every(Number.isFinite))
    throw new Error("Invalid embedding dimensions");
  return vector;
}
const queryVectors = new Map<string, number[]>();
let queue = Promise.resolve();
scope.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      if (data.type === "init") {
        extractor ??= await createExtractor(
          "feature-extraction",
          SEMANTIC_MODEL,
          {
            revision: SEMANTIC_REVISION,
            dtype: "q8",
            device: "wasm",
            progress_callback: (p) =>
              scope.postMessage({
                type: "progress",
                detail: "file" in p ? `${p.status}: ${p.file}` : p.status,
                progress:
                  p.progress === undefined ? undefined : p.progress / 100,
              }),
          },
        );
        const records = data.records as { id: string; text: string }[];
        const ids = records.map((r) => r.id);
        const fingerprint = [
          ...new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(JSON.stringify(records)),
            ),
          ),
        ]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
        const key = new URL("gamma-index.json", scope.location.origin).href;
        const existing = await (await cache()).match(key);
        const cached: unknown = existing
          ? await existing.json().catch(() => null)
          : null;
        if (validIndex(cached, ids, fingerprint)) index = cached;
        else {
          const vectors: number[][] = [];
          const reuse = reusableVectors(cached);
          for (const [i, record] of records.entries()) {
            const old = reuse.get(record.id);
            vectors.push(
              old?.text === record.text ? old.vector : await embed(record.text),
            );
            scope.postMessage({
              type: "progress",
              detail: `Indexing local guidance: ${i + 1}/${records.length}`,
              progress: (i + 1) / records.length,
            });
          }
          index = {
            version: 1,
            model: SEMANTIC_MODEL,
            revision: SEMANTIC_REVISION,
            fingerprint,
            ids,
            vectors,
            texts: records.map((r) => r.text),
          };
          await (await cache()).put(key, new Response(JSON.stringify(index)));
        }
        scope.postMessage({ type: "ready" });
      } else if (data.type === "query" && index) {
        const text = String(data.text).slice(0, 2000);
        const query = queryVectors.get(text) ?? (await embed(text));
        queryVectors.set(text, query);
        if (queryVectors.size > 64)
          queryVectors.delete(queryVectors.keys().next().value!);
        const scores = index.vectors
          .map((v, i) => ({
            id: index.ids[i],
            score: v.reduce((s, n, j) => s + n * query[j], 0),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
        scope.postMessage({ type: "result", id: data.id, scores });
      }
    } catch (e) {
      scope.postMessage({
        type: "error",
        id: data.id,
        detail: e instanceof Error ? e.message : "Semantic inference failed",
      });
    }
  });
};
