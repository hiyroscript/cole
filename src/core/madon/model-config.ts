// Verified against WebLLM 0.2.86's catalog and the official artifact manifests.
export const MODEL_ID = "Qwen3-1.7B-q4f16_1-MLC";
export const RUNTIME_VERSION = "0.2.86";
export const CONTEXT_SIZE = 4096;
export const WEIGHT_BYTES = 968001536; // 30 ndarray-cache.json shards; excludes tokenizer/WASM.
export const VRAM_MB = 2036.66;
export const MODEL_VERSION = `${MODEL_ID}/webllm-${RUNTIME_VERSION}`;
