# Madon local model integration

Madon is an opt-in website preview backed by actual WebLLM generation. It is **not yet a hardware-verified release**: this implementation environment exposes the WebGPU API but returns no adapter. The full `max` definition of done remains blocked on the real GPU checks below. Mocked tests verify integration behavior, not model quality, speed, successful model loading, or offline inference.

## Use

1. Run `npm ci`, `npm run build`, then `npm run preview`, or open the deployed `/varek/` website after this change is released.
2. Select **Madon** in the model menu. Gamma remains the initial default. Selecting a model never downloads weights.
3. Read setup's requirements and click **Download and initialize**. This grants permission to fetch missing model files. Initialization reuses WebLLM caches when possible. Every reload/unload requires another explicit initialization; missing or evicted files are never silently redownloaded on page load.
4. Close setup when Ready and send a message. Stop interrupts the underlying inference and retains visible text. A stalled worker is terminated after five seconds during cancellation; reinitialization is then required.
5. Auto/On/Off controls Qwen3 thinking. Hidden reasoning is discarded, never displayed or saved. A thought-only response that exhausts the generation budget produces an actionable error. Try Off or a shorter request.
6. Use **Use web sources** only if you want factual queries sent to Wikimedia. It is off initially. Search is limited to eligible public factual questions, not arbitrary browsing, URLs, personal/device prompts, or complete chat histories. Review your own prompts before enabling it. Wikimedia may not have current information.
7. **Settings → Assistant setup → Set up Madon → Unload model** frees the worker and GPU resources. **Remove model data** confirms and calls WebLLM's model-specific removal API. It preserves other model/site caches. Browser site-data settings can also remove data. Clearing all Cole data includes Madon data.

No model weights are committed, backend is needed, or inference API is called. The extension deliberately supports Gamma only: no inference runtime is included in its output and its CSP/permissions remain unchanged. Current-page summarization is deferred until compliant, packaged MV3 inference is implemented and tested. Existing permissioned `/page` and `/reader` commands still work.

## Verified configuration

- `@mlc-ai/web-llm` **0.2.86**, pinned in package/lockfile.
- Catalog ID **Qwen3-1.7B-q4f16_1-MLC**. Its compiled WASM URL is taken from that version's built-in catalog, never constructed by Cole.
- Runtime context **4,096 tokens**; output budget 512 (Off) / 1,024 (On), with 128 tokens reserved for extra template/prefix overhead. Qwen's architectural 40,960 limit is not used.
- Official `ndarray-cache.json`: **30 shards totaling 968,001,536 bytes** on 2026-10-24. This is manifest-declared weight size, not a measured full download; tokenizer/config/WASM add overhead.
- Catalog GPU-memory estimate: **2,036.66 MB**, not a measurement of available VRAM. More system resources can be needed.
- Required checks: secure context, WebGPU, adapter, `shader-f16`, minimum buffer limits. Only real initialization can validate device/driver/memory compatibility.
- Official Qwen3 template starts a normal assistant reply. WebLLM 0.2.86's `extra_body.enable_thinking=false` inserts the native empty thinking prefix; `true` leaves the thinking-capable header intact. Cole uses this supported interface instead of passing its `/think` commands to the model. On-device behavior still needs hardware verification.

Reviewed upstream reports: [Adreno device loss #836](https://github.com/mlc-ai/web-llm/issues/836), [Qwen JSON grammar failures #807](https://github.com/mlc-ai/web-llm/issues/807), and [reasoning-history semantics #874](https://github.com/mlc-ai/web-llm/issues/874). Cole uses plain text generation, bounded prompts, no JSON grammar, explicit error recovery, and final-answer-only history. Pinning a release is not evidence that every GPU regression is fixed.

## Architecture and boundaries

`models.ts` exposes typed adapters for both engines. Gamma uses its upgraded deterministic pipeline and presentation stream; its optional sentence embeddings are separate from Madon. Madon's runtime is a single observable lifecycle controller; its dynamically imported transport uses the official `WebWorkerMLCEngine` and `WebWorkerMLCEngineHandler`. No generation mock is shipped.

Initialization exposes genuine WebLLM progress, with indeterminate progress when none is available. Initialization has a 15-minute timeout, generation a 120-second idle timeout, and no automatic retry loop. Unload terminates the worker, including pending setup. State covers unsupported hardware, cache/storage failure, insufficient memory, partial-output failure, and cancellation. Retry requires user action.

Prompt construction preserves complete recent user/assistant pairs, with at most eight pairs. It excludes command, failed and stopped turns and conservatively budgets UTF-8 bytes as a bound for the byte-level tokenizer, including role overhead. This intentionally fits fewer English words than exact tokenization would. Overlong user input is rejected explicitly. Older context omission is shown in context notes; starting/clearing a conversation resets it. IndexedDB schema 1 is unchanged; model/version, failure, stop and structured-source metadata are optional and validated for old records.

Trusted commands execute before inference. A deterministic router collects browser evidence for relevant questions, preserving classifications. High-confidence authored knowledge can provide local reference text. Neither generated text nor source text can execute a tool. Diagnostics cannot measure exact VRAM, OS activity or hardware acceleration simply from API presence.

Wikimedia queries use anonymous `origin=*` CORS requests with credentials omitted, an eight-second timeout, namespace/result/content limits, response validation and fixed HTTPS source URLs. Provider failure/empty results are reported in visible context notes and to the model. Source links are rendered from retrieved metadata; generated links are not clickable. Sources are untrusted prompt data. This reduces injection authority but does not guarantee that a small LLM will ignore every malicious passage. No model output has an execution path.

The PWA shell cache owns same-origin Cole code/assets only. Large inference JavaScript chunks are excluded from initial shell precache and cached when requested. WebLLM separately owns downloaded weights, config, tokenizer and compiled model assets. Ordinary app updates never clear WebLLM caches. Cache inspection is a runtime hint, not proof that every asset survived eviction. Offline Madon is **not claimed verified** until the real smoke test succeeds.

Qwen3 and WebLLM are Apache-2.0; see [Qwen3](https://huggingface.co/Qwen/Qwen3-1.7B), [quantized MLC assets](https://huggingface.co/mlc-ai/Qwen3-1.7B-q4f16_1-MLC), and [WebLLM](https://github.com/mlc-ai/web-llm). Model answers may be wrong or outdated. This 1.7B local model is not equivalent to a frontier cloud assistant.

## Verification and release gate

Automated checks on 2026-10-24:

- Strict TypeScript; knowledge validator (205 records, 831 expressions, 103 paths).
- 1,026 Vitest tests, including new lifecycle, cancellation, parser, prompt, evidence, retrieval, preference and security coverage.
- 28 production Playwright cases across desktop/mobile, including official-protocol worker mocks, no-download selection, follow-ups, cancellation/recovery, missing-cache failures, persistence, no-WebGPU, and Gamma/offline regressions.
- Website and MV3 production builds; 13 extension checks covering security/permissions, local page extraction, and the website-only model boundary.
- Chromium 156.0.8078.4 real probe: WebGPU API true, adapter false. No model download, initialization, output, generation speed or cached-model offline result can be reported.
- Real browser CORS requests to official model metadata and Wikimedia lookup both returned HTTP 200.

Observed production sizes before gzip: initial web JavaScript about 499 KB; lazy transport about 5.97 MB; worker about 6.14 MB. These are bundle sizes, not memory/speed benchmarks. No initialization-time or tokens-per-second benchmark is available.

On supported hardware, start the production preview and run:

```sh
npm run test:madon:real -- --download
# Optional desktop browser window:
HEADED=1 npm run test:madon:real -- --download
```

The opt-in smoke script uses the real production UI, no mocks, and permits roughly 1 GB of downloads. It checks initialization, Off/On answers, a follow-up, cancellation/reuse, reload and offline cached reinitialization. It exits 2 when hardware or download authorization is unavailable, 1 on failure. Also manually inspect answer quality, tab switching, long prompts, reload during setup and storage eviction on supported target browsers before release. Do not mark the preview fully available or claim offline inference until these pass. The existing GitHub Pages workflow validates/builds this static app under `/varek/`; this branch does not establish a deployment.
