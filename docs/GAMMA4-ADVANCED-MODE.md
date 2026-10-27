# Gamma Deep Mode: implementation and model evaluation

Gamma Core is the default deterministic engine. Deep Mode is a separately initialized, website-only CPU drafting experiment. It never selects Madon; Madon remains the separate Qwen3/WebLLM option. The real WebGPU probe found no compatible adapter, so no GPU inference result is claimed.

## Model and resources

The research-preview candidate is `onnx-community/Qwen2.5-0.5B-Instruct`, an ONNX conversion of Qwen's Apache-2.0 model. Revision: `22942cb7d7ba4cc81bb4673549ca4d4614469b5e`. Quantized weights: **512,096,557 bytes (488.4 MiB)**. SHA-256: `41834041ab1b29eff9fc592f1a29a1844133aea35832ea9fa91682be13016100`. [Publisher metadata](gamma4/completion-runtime/qwen-metadata.json) records the upstream license and conversion identity.

The existing packaged Transformers.js 3.8.1/ONNX Runtime executes single-thread WASM on CPU. Tokenizer/config and packaged runtime assets are additional downloads; total cached model bytes are recorded in the real report. Weights are checked before generation is allowed, including when the library tolerates a cache-write error. The pinned URL and checksum refer to the converted artifact, not the upstream safetensors file.

Large inference code and weights do not load during normal Core use. Setup requires a separate affirmative download action. Initialization has a ten-minute timeout, progress, cancellation and retry. Generation has a two-minute timeout and terminates its worker on abort. Memory use can be substantial; neither model parameter count nor JavaScript heap snapshots establish peak process memory. Physical mobile, Firefox/Safari and GPU execution remain unverified.

## Evidence and output contract

Use `/deep TOPIC` for a directly supported Core subject or `/deep summarize documents` for selected local documents. `/deep status`, `/deep off` and `/deep clear` inspect, stop and selectively remove the mode's assets. `/deep on` gives setup instructions; it does not download automatically.

The worker receives a question and at most four bounded evidence entries, not full conversation history. Evidence text is capped at 3,600 characters overall and 1,800 per entry, with a 1,536-token prompt limit and at most 384 generated tokens. Document selection takes bounded cited excerpts, so a draft is not a summary of unseen portions of a file.

The model is asked for JSON containing an answer and exact source quotations. Validation requires bounded fields, known source IDs, quotations present in the actual evidence, a quotation from every supplied source, no invented numeric values and no generated URLs. Output is escaped inert text. Generated content cannot select or invoke tools, change settings or make network requests. Invalid drafts produce Core evidence with an explicit rejection reason.

**These checks do not prove entailment or factual correctness.** A quote can be valid while a conclusion is wrong or incomplete. The UI calls the output an experimental draft and displays its evidence for verification. Multi-source quotation coverage is necessary but does not prove that the draft preserves a disagreement.

## Actual experiments

The earlier SmolLM2-360M q8 candidate was exercised in real Chromium CPU inference. Cold setup took 119,020 ms in a normal profile, offline initialization 2,861 ms, and selective deletion passed. The first prompt produced 0/4 structurally valid cited drafts. With an example-based prompt, 1/4 passed the earlier structural check, but manual review found that its sole accepted draft omitted a source disagreement. The model also introduced unsupported boiling temperatures and copied an instruction-bearing link; those drafts were rejected. It was replaced rather than advertised as a reliable reasoning upgrade. [Raw reviewed outputs](gamma4/completion-runtime/deep-smollm-reviewed.json) and [first prompt](gamma4/completion-runtime/deep-prompt-attempt.json) remain available.

A private/incognito-profile attempt loaded the model but retained only tokenizer/config assets, then failed offline. The runtime now reports cache-write failures; ready does not imply that all assets survived storage limits. A normal persistent profile successfully reused the model offline. Browser eviction can still remove cached data. The real validation script uses the production service-worker update lifecycle for retained profiles. An earlier harness attempt raced shell installation and is preserved as a failed attempt. Model caches survive until explicit removal.

Qwen initialized from a cold download in **246,660 ms** in the earlier attempt. Its final retained-profile setup took **4,947 ms**, and offline initialization took **4,387 ms**. Cached model/config/tokenizer data totaled **519,136,999 bytes**, excluding packaged runtime code. Eight generations took **7.5–41.8 seconds**, median **12.5 seconds**. Real UI fallback, cancellation during inference and selective removal passed, with no page errors.

Only **2/8 drafts** passed validation: 1/4 development probes and 1/4 prospective probes. Manual review found the accepted comparison missed the disagreement, and the accepted maintenance extract omitted the no-causation caveat. Rejected drafts included paraphrased quotations, invented IDs, missing citations, incorrect claims or invalid JSON. **This is a research preview, below a general-use reliability bar. Core is recommended.** Setup states this measured limitation. See [manual review](gamma4/completion-runtime/deep-quality-review.json).

During part of the real generation run, the largest observed browser process RSS was **2,329,862,144 bytes**; the maximum sampled sum across that browser's descendant processes was **3,566,694,400 bytes**. Summed RSS double-counts shared pages, and sampling began after setup, so these are observations rather than a complete peak-memory requirement. Weight size substantially understates working memory. See [RSS samples](gamma4/completion-runtime/deep-rss-sample.json).

The final candidate's raw generation, timing, cache inventory, real UI draft, cancellation and selective-removal results are recorded in [deep-real.json](gamma4/completion-runtime/deep-real.json). The first four prompts are exposed development probes. The next four were frozen before testing the replacement model in [deep-quality.json](../tests/evaluation/deep-quality.json); these are implementer-authored probes, not independent or representative accuracy evaluation. Schema/quote acceptance and manual answer quality are separate measures.

Run a production preview, then `npm run test:deep:real -- --download`. A clean temporary persistent profile is used by default. `GAMMA_MODEL_PROFILE` can select a dedicated retained validation profile; it must not point to a personal browser profile. The explicit flag authorizes the model download. No real model weights are committed or included in ordinary CI.

## Remaining boundaries

Deep Mode is experimental constrained drafting, not general reasoning or a replacement for Core retrieval. General entailment, reliable semantic contradiction detection, multilingual drafting quality, physical-device compatibility, peak native/process memory and GPU/MV3 inference are not certified. The existing Madon GPU probe is separate and still has no successful adapter execution in this environment.
