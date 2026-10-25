# Gamma 2.0 implementation and release gate

Gamma is Cole’s default lightweight assistant: **Fast, private browser and device intelligence.** Madon remains the separate Qwen3-1.7B/WebLLM generative assistant. No request to Gamma initializes Madon. The Cole monochrome interface, project path `/varek/`, storage namespaces, and extension permissions are preserved.

This branch implements the rebrand, engine upgrade and all numeric content/evaluation targets in `max`. See [the delivery report](GAMMA-DELIVERY.md) for measured quality, regression results, payload growth and remaining release limits.

## Execution architecture

`src/core/models.ts` retains the typed adapter contract and presentation streaming. `src/core/gamma/engine.ts` orchestrates trusted commands, structured language processing, contextual routing, retrieval, diagnostics, response depth, and graph state. Shared browser actions remain outside the semantic worker.

- `language.ts`: Unicode normalization, browser/platform/API/error/version/display entities, explicit symptom exclusions, bounded concept expansion, destructive-request constraints.
- `retrieval.ts`: prebuilt inverted index, exact authored aliases, BM25 term weighting, phrase coverage/boosts, entity relevance, and bounded typo matching. Rank utilities are **not probabilities**. The engine distinguishes unsupported, ambiguous, moderate, and high matches; ambiguous questions receive choices.
- `context.ts`: bounded cloned state and browser references. Stale topic references expire after 30 minutes/24 turns, but stated browser/platform and a diagnostic session survive. This is local conversation context, not cross-chat memory.
- `workflows.ts` / `scenarios.ts` / `more-scenarios.ts`: stable node IDs, multi-choice questions, recommendations, confirmation, completion and escalation. History is capped at 24 observations; prior steps are retained. Recommendations do not perform browser changes. The existing numeric-flow adapter still resumes old conversations.
- `diagnostics.ts`: snapshot shape and capability reporting using classified browser observations. `/health` reports API exposure, quota concerns and unavailable measurements. API exposure is not a successful WebGPU adapter or permission grant.
- `web.ts`: explicit lookup-only Wikimedia extracts through the existing Madon retrieval client. Sources stay data, never commands. Markdown metacharacters in extracts are escaped; actual provider metadata supplies HTTPS citations.
- `semantic.ts`, `semantic-worker.ts`, `semantic-config.ts`, `hybrid.ts`: optional, separate worker lifecycle and conservative experimental reranking.

The new retrieval code does not replace Madon’s lexical reference selector or its runtime, prompts, generation parameters, transport, or model. Changes inside Madon’s source are branding-only.

## Optional enhanced understanding

Settings → Gamma → Enhanced understanding offers explicit download/initialization consent. `/enhance on` opens this setup; it does not initiate a download. A saved preference alone does not load a model after reload. Initialization is single-flight, reports real download/index progress, has a timeout, and supports termination. Failed, cancelled, absent, or disabled inference falls back to lexical matching. Cancellation terminates the worker; explicitly initialize again to resume enhanced mode.

The official `@huggingface/transformers` dependency is pinned to **3.8.1**. Model: **Xenova/all-MiniLM-L6-v2**, revision **751bff37182d3f1213fa05d7196b954e230abad9**, q8 ONNX, mean pooling, normalized **384-dimensional** vectors, single-thread CPU/WASM. Quantized weight size is **22,972,370 bytes**; SHA-256 is **afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1**, verified against the artifact manifest. The custom cache checks the checksum when storing the weights. Tokenizer/config files add approximately 713 kB; the packaged ONNX JSEP WASM is **21,596,019 bytes** plus runtime JavaScript. These are separate downloads, not part of the initial application shell.

The first setup computes knowledge vectors in the worker. Subsequent initialization reuses a cache keyed by model revision and a SHA-256 fingerprint of ordered record IDs/text. Validation checks IDs, dimensions, finite values, normalization, fingerprint, and index version. No model weights are committed. A precomputed distributed index is not shipped.

`gamma-semantic-v1` holds model assets and the index. Disabling preserves the cache; Remove enhancement data deletes only that cache. The application-shell update deletes only obsolete `varek-` caches. Lazy same-origin runtime assets are cached after use. Browser eviction can remove any cache; setup consent allows missing files to download again.

Semantic similarity cannot override exact matches, explicit symptom exclusions, or dangerous-request constraints. Current hybrid mode only boosts sufficiently similar **lexical candidates**, with a small capped contribution. It does not produce prose or autonomously invoke tools. This intentionally leaves some semantic-only paraphrases unsupported. The 38-case development benchmark improves from 84.6% accepted lexical intent accuracy to 88.5% hybrid, with no false accepts among 12 unsupported cases. Broader hybrid calibration is still a release gate; this small improvement does not establish general accuracy, and lexical mode remains the default.

Real Chromium/WASM initialization with all 700 record vectors, inference across 38 queries, cached offline initialization, and selective cache removal were tested. See [semantic measurements](gamma-semantic-measurements.json). This is real inference, not the lifecycle mocks used by unit tests. Physical mobile devices, Safari, Firefox, and extension inference were not validated. The extension deliberately excludes semantic worker/WASM assets and disables setup; its ordinary Gamma functionality remains bundled and offline.

## Context, evidence and commands

Gamma tracks topic, bounded user goal, requested depth, stated/detected browser separately, stated platform, last recommendation, attempted checks, workflow node, bounded answers, and last public lookup sources. Follow-ups resolve instructions, repair requests, selected browser comparisons and numbered diagnostic options without choosing an option on the user’s behalf. Browser corrections end the prior diagnostic; restart/stop clear stale recommendations. Device notes remain user-provided information. No background page observation or ongoing fingerprint collection is added.

New commands: `/gamma`, `/health`, `/context [clear]`, `/explain`, `/sources`, `/enhance status|on|off`, `/web status|on|off`, `/compare chrome firefox|cache cookies`. `/diagnose` now accepts `status`, `restart`, and `stop`. The central registry validates arguments. `/web on` explicitly enables sending bounded public queries; it does not send conversation history. `/sources` currently reports the most recent **public lookup**, not a full citation history for all authored advice.

`/tab`, `/tabs pin|unpin`, `/page`, and `/reader` retain the extension’s own-origin/sender validation, activeTab consent and minimal permissions. Page metadata fields are bounded; missing language and alternative text receive controlled explanatory guidance. Counts do not certify accessibility. Page text cannot become a privileged instruction.

## Migration

The legacy model ID `zulvyn` is normalized to `gamma` on load. The same normalization supports the old `/model zulvyn` alias without advertising it. `src/lib/legacy.ts` is the narrow compatibility boundary.

The `varek` IndexedDB database (version 1) and `varek.preferences.v1` key are unchanged. IDs, titles, timestamps, pinning, messages, evidence, valid prior context and settings are preserved. Madon messages retain their model/version. **Freeform text is never rewritten**, including old assistant text and user mentions of the former brand; the updated attribution uses Gamma. Malformed optional diagnostic state is discarded without discarding the conversation. There is no import feature to migrate; exports of loaded conversations contain normalized metadata.

`npm run check:brand` checks tracked and new text files, with narrow allowlisted compatibility/tests/specification documentation. It runs in CI.

## Extending Gamma

Add distinct authored knowledge to `src/data/gamma.ts` or another typed data module. Supply stable IDs, realistic expressions, a meaningful answer and step, a real HTTPS source, review date and relevant platform metadata. Optional safety classification and safety notes belong on higher-risk records. Existing records remain compatible. Avoid generated wording permutations or duplicated answers to increase counts.

New intents need independent paraphrase, exclusion, ambiguity and unsupported examples in addition to exact aliases. Add multi-turn scenarios under `tests/gamma-cases.ts`. Add graph nodes with stable IDs and explicit transitions; validate references and exercise paths. Add commands only to the trusted registry with argument validation, permission requirements, error behavior and tests. Never attach executable actions to source/model text.

`npm run validate:knowledge` checks duplicate IDs/expressions/answers, required content, HTTPS references, dates, related IDs, platform labels, risk notes, graph structure, and authored-expression ownership. The coverage report counts terminal graph paths separately from unique workflows. It also checks duplicate conversations, minimum coverage, duplicate workflow IDs and unreachable nodes. It does not prove external URL availability, editorial accuracy, or absence of subtle paraphrased filler; these still need editorial review.

## Coverage and remaining release gates

Current generated counts: **700 records**, **2,811 expressions**, **75 unique workflows**, **560 terminal branch paths**, **300 independently authored multi-turn scenarios**. Expression tests and exhaustive branch traversal tests are not counted as independent conversations. Targets in `max` are **700 / 2,500 / 75 / 250 / 300**, respectively; all are met and enforced by the validator.

Additional content lives in `additional.ts`, `network-security.ts`, `platform-guidance.ts` and `web-platform.ts`. Literal scenarios are split across `gamma-cases.ts`, `gamma-conversations.ts`, `gamma-graph-conversations.ts` and `gamma-context-conversations.ts`. Every workflow has at least one public-pipeline conversation case; the cases include distinct observations, failures, explanations, correction, reset, safety and platform constraints.

The separate [reference audit](gamma-reference-audit.json) checked 333 unique HTTPS references: 329 returned HTTP 200; three CISA pages returned 403 and Ubuntu help returned 503, so their availability remains unverified. HTTP status checks do not certify editorial accuracy.

Other remaining limits: bounded English-only understanding, only selected comparisons and compound diagnostic requests, no general reasoning model, no automatic diagnostic tool graph nodes, no comprehensive browser-version applicability enforcement (known OS metadata conflicts are clarified before recommending platform-specific actions), no precomputed distributed semantic index, no physical-device memory/performance study, no large held-out hybrid benchmark, no general web summaries, and no MV3 semantic inference. Unsupported requests ask for a more specific supported topic; Madon is never selected silently.

The small development benchmark compares old and new lexical algorithms on the same expanded corpus. It mixes exact controls and independently written paraphrases and must not be called a representative production accuracy estimate. Raw semantic neighbor accuracy is separate from the engine’s acceptance decisions. See [lexical results](gamma-evaluation.json) and [performance measurements](gamma-performance.json). The expanded default payload is 814,491 bytes (261,667 gzip), up 63.0% from baseline and above the initial 650 kB/210 kB gzip budget. Five fresh-context local-preview samples measured median composer readiness at 586.7 ms and a reduced-motion answer visible at 79.6 ms. These are container observations, not mobile performance promises.

## Verification and deployment

Run:

```sh
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci
npm run check:brand
npm run typecheck
npm run validate:knowledge
npm test
npm run evaluate:gamma
npm run build
npm run build:extension
npx playwright install chromium
npm run test:e2e
npm run test:extension
```

The CUDA install flag avoids an unused native GPU download: production inference here is browser CPU/WASM, not ONNX Node CUDA. For repeatable browser startup/payload measurements, run the production preview on port 4173, then `npm run measure:gamma`. For the opt-in real semantic test, use the same preview and `npm run test:gamma:real`. It deliberately downloads the optional model and writes measured results. Proxy settings are respected when present.

Production still builds for GitHub Pages at `/varek/`; extension assets are separate. A draft branch/PR is not deployment. No successful Pages deployment is claimed for this work. Madon’s real GPU inference remains subject to its existing hardware-validation gate in [MADON.md](MADON.md).
