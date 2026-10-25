# Gamma 2.0 delivery report

The previous Gamma upgrade specification was implemented on `feat/gamma-2`: Gamma is the default assistant, the active rename and saved-data compatibility are complete, and all five numeric coverage targets pass. That upgrade preserved the original interface, `/varek/` base path, local storage namespaces and extension permissions. The interface has since been redesigned; see [Cole delivery](COLE-DELIVERY.md). Madon retains its separate Qwen3/WebLLM inference behavior. This report describes tested behavior and remaining limits; it is not a claim of production deployment or universal model accuracy.

## Implementation

Gamma now uses a modular entity/negation/context pipeline, inverted lexical index with BM25 and phrase signals, conservative semantic reranking, and stable diagnostic graphs. It handles bounded compound requests, browser corrections, explicit follow-ups, numbered option explanations, depth changes, stale context and OS applicability conflicts. Recommendations distinguish user reports, browser observations, estimates and unavailable measurements. Restart/stop/clear do not leave stale recommended actions active.

MiniLM embeddings run in a separate CPU/WASM worker only after explicit setup consent. The model and index are revision/fingerprint validated; optional assets are excluded from the shell precache. Real progress, cancellation, failure fallback, offline reuse, disable and selective deletion work. Gamma never initializes or silently switches to Madon. The extension packages deterministic Gamma and disables semantic setup.

New commands include `/gamma`, `/health`, `/context [clear]`, `/explain`, `/sources`, `/enhance status|on|off`, `/web status|on|off`, `/compare`, and diagnostic status/restart/stop. Browser capability checks use actual exposed APIs. Public Wikimedia retrieval requires opt-in and an explicit lookup, returns literal attributed extracts and cannot execute source instructions. Extension metadata/text reads retain activeTab consent, sender validation and bounded extraction.

Legacy model identifiers normalize to Gamma at the storage/command compatibility boundary. Conversation IDs, titles, timestamps, pins, messages, evidence and valid context survive. Freeform historical text is unchanged. Invalid optional workflow state does not discard the entire conversation. See [migration details](GAMMA.md#migration).

## Verified coverage

| Metric                        | Required | Actual |
| ----------------------------- | -------: | -----: |
| Authored records              |      700 |    700 |
| Distinct expressions          |    2,500 |  2,811 |
| Unique workflows              |       75 |     75 |
| Terminal diagnostic paths     |      250 |    560 |
| Authored multi-turn scenarios |      300 |    300 |

The [generated report](coverage.json) has no errors. Literal conversation exchanges are independent of expression loops and exhaustive graph traversal. Every workflow has conversation coverage; terminal paths count distinct start-to-completion/escalation paths, including success/failure alternatives. The validator rejects duplicate records, expressions, answers and conversations; checks references, platform labels, safety metadata and exact-expression ownership; validates graph links/reachability; and enforces coverage minima. Automated validation cannot prove all prose is editorially correct or detect every paraphrased duplicate.

The [reference audit](gamma-reference-audit.json) checked 333 unique URLs: 329 returned HTTP 200. Three CISA pages returned 403 and Ubuntu help returned 503; availability of these four remains unverified. Broken paths and locale-dependent Google support links were corrected.

## Quality measurements

The development set has 38 queries: 26 supported and 12 unsupported. It mixes exact controls and authored paraphrases, and was used during development. It is **not a held-out production accuracy estimate**. The original and new lexical algorithms use the same expanded corpus.

| Retrieval                     | Accepted correct intent / supported | Recall@3 | False accepts / unsupported | Median / p95 query latency          |
| ----------------------------- | ----------------------------------: | -------: | --------------------------: | ----------------------------------- |
| Original lexical algorithm    |                               73.1% |    73.1% |                        8.3% | 1.89 / 17.15 ms                     |
| Gamma lexical                 |                               84.6% |    92.3% |                          0% | 0.40 / 2.90 ms                      |
| Gamma hybrid, real embeddings |                               88.5% |    92.3% |                          0% | Embedding operation: 22.0 / 91.4 ms |

Full local engine routing/retrieval/graph selection/composition measured median 0.43 ms and p95 2.63 ms with injected empty facts, excluding display animation and optional inference. Raw semantic nearest-neighbor top-1 and Recall@3 were both 88.5%; raw neighbors are not acceptance decisions. Misses are retained in the [lexical](gamma-evaluation.json) and [semantic](gamma-semantic-measurements.json) reports. Hybrid stays optional and experimental.

The actual MiniLM q8 weights are **22,972,370 bytes**, with approximately 713 kB of tokenizer/config files, **21,596,019 bytes** of packaged WASM and additional runtime JavaScript. Model revision, checksum and runtime version are pinned in [GAMMA.md](GAMMA.md#optional-enhanced-understanding). Cold setup plus construction of 700 vectors measured **29,421 ms**. Cached offline initialization, 38 actual inference queries and selective cache removal passed in Chromium.

Initial application JavaScript grew from **499,750 to 814,491 bytes** (**+63.0%**); gzip grew from **160,640 to 261,667 bytes**. This exceeds the initial **650 kB / 210 kB gzip budget** and is a documented regression associated with the expanded bundled content and workflows. Heavy inference runtimes/weights still load only when requested. Five fresh browser contexts measured median composer readiness **586.7 ms**, a reduced-motion answer visible in **79.6 ms**, and CDP JavaScript heap **9,383,856 bytes**. These measurements used local production preview in a Linux container; there is no measured pre-upgrade startup counterpart. Heap is not total process memory or peak inference memory. See [performance measurements](gamma-performance.json).

## Verification

| Check                               | Result                                               |
| ----------------------------------- | ---------------------------------------------------- |
| TypeScript                          | Pass                                                 |
| Branding audit                      | Pass                                                 |
| Knowledge/graph/scenario validation | Pass, zero errors                                    |
| Vitest                              | 3,331 pass, including Madon regression tests         |
| Playwright                          | 36 pass, desktop and emulated mobile Chromium        |
| Production Chromium extension       | 13 checks pass                                       |
| Website production build            | Pass, `/varek/` preserved                            |
| Extension production build          | Pass, separate bundle, same permissions              |
| Real MiniLM/WASM smoke              | Pass: setup, inference, offline reuse, cache removal |
| Desktop/mobile welcome screenshots  | Inspected; existing layout and branding retained     |
| GitHub Pages deployment             | Not performed; the review branch does not deploy     |

The extension test verifies the shipping permission denial and uses a separate temporary localhost-permission fixture for extraction/pinning. This is not a physical toolbar consent test in every Chromium variant. CI retains all checks and adds branding validation; its outcome must be read from the PR checks separately.

## Remaining limits

Understanding is bounded and English-only. Arbitrary complex comparisons, open-ended reasoning, multilingual behavior and some semantic-only paraphrases remain unsupported. OS metadata conflicts are clarified, but complete browser-version applicability is not modeled. Graphs recommend checks rather than executing autonomous diagnostic tools. The semantic index is built locally instead of distributed precomputed. Web output is literal extracts, not generated summaries; `/sources` covers the most recent public lookup.

Physical mobile, Safari/Firefox inference, peak inference memory, and MV3 semantic inference are unverified. The extension deliberately uses lexical Gamma. Madon real GPU initialization/generation remains unverified because this environment has no usable WebGPU adapter; its actual runtime behavior was preserved and its existing regression tests pass. Broader held-out semantic evaluation, payload reduction and device testing remain release work.

## Files changed

- `.github/workflows/deploy.yml`
- `README.md`
- `docs/DEVELOPING.md`
- `docs/GAMMA-DELIVERY.md`
- `docs/GAMMA.md`
- `docs/MADON.md`
- `docs/STATUS.md`
- `docs/coverage.json`
- `docs/gamma-evaluation.json`
- `docs/gamma-performance.json`
- `docs/gamma-reference-audit.json`
- `docs/gamma-semantic-measurements.json`
- `extension/background.ts`
- `extension/manifest.json`
- `extension/popup.html`
- `package-lock.json`
- `package.json`
- `scripts/check-brand.ts`
- `scripts/evaluate-gamma.ts`
- `scripts/extension.mjs`
- `scripts/measure-gamma.mjs`
- `scripts/semantic-assets.mjs`
- `scripts/service-worker.mjs`
- `scripts/smoke-gamma.mjs`
- `scripts/smoke-madon.mjs`
- `scripts/validate-knowledge.ts`
- `src/app/App.tsx`
- `src/components/GammaSetup.tsx`
- `src/components/MadonSetup.tsx`
- `src/core/commands.ts`
- `src/core/gamma/context.ts`
- `src/core/gamma/diagnostics.ts`
- `src/core/gamma/engine.ts`
- `src/core/gamma/hybrid.ts`
- `src/core/gamma/language.ts`
- `src/core/gamma/more-scenarios.ts`
- `src/core/gamma/rerank.ts`
- `src/core/gamma/retrieval.ts`
- `src/core/gamma/scenarios.ts`
- `src/core/gamma/semantic-config.ts`
- `src/core/gamma/semantic-worker.ts`
- `src/core/gamma/semantic.ts`
- `src/core/gamma/web.ts`
- `src/core/gamma/workflows.ts`
- `src/core/madon/capabilities.ts`
- `src/core/madon/runtime.ts`
- `src/core/models.ts`
- `src/core/stream.ts`
- `src/core/types.ts`
- `src/data/additional.ts`
- `src/data/gamma.ts`
- `src/data/knowledge.ts`
- `src/data/network-security.ts`
- `src/data/platform-guidance.ts`
- `src/data/web-platform.ts`
- `src/lib/diagnostics.ts`
- `src/lib/legacy.ts`
- `src/lib/storage.ts`
- `tests/browser/app.spec.ts`
- `tests/browser/gamma.spec.ts`
- `tests/browser/madon.spec.ts`
- `tests/engine.test.ts`
- `tests/extension.mjs`
- `tests/gamma-cases.ts`
- `tests/gamma-context-conversations.ts`
- `tests/gamma-conversations.ts`
- `tests/gamma-graph-conversations.ts`
- `tests/gamma.test.ts`
- `tests/madon.test.ts`
- `tests/migration.test.ts`
- `vite.config.ts`
