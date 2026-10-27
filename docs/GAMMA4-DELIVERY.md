# Gamma 4.0 delivery

Gamma now has a shared request/evidence/tool pipeline, additional local operations, bounded document and research analysis, and an explicit website-only local drafting mode. The numerical intelligence targets in `max` are **not all achieved**. Core remains deterministic and usable without model setup; Deep Mode and Madon have separate identities, setup and execution.

The earlier [PR #6](https://github.com/hiyroscript/cole/pull/6) was merged into `main`; this continuation is on `feat/gamma4-documents-deep`, based on merge commit `c6927f0`. No merge or deployment is performed by this continuation. The [initial audit](GAMMA4-AUDIT.md) describes the original weaknesses. Baseline: `1a30900`; the previous implemented stage is `ab81293`. Current reports use `completion-*` and `completion-runtime/`. Earlier `final-*`, Gamma 3 reports and frozen fixtures remain preserved.

## Working implementation

- **Understanding and composition:** at most six typed tasks, with subjects, entities, constraints, dependencies and required capabilities. Explicit additional sentences and coordinated explanations split into separate tasks. Quotes, JSON, CSV and other payloads remain data. Each part reports its own outcome and sources; unresolved dependencies do not count as completed. Comparison follow-ups can project authored AI-use dimensions across the compared subjects.
- **Retrieval and acceptance:** grammatical framing and abbreviation normalization, cached answer-field discovery, independent checks for central subjects and coherent evidence, and conservative semantic discovery. Similarity is not a probability or proof. Requests for access, measurements, mutations or current facts cannot be satisfied by adjacent explanatory records. Legacy acceptance paths still limit general correctness.
- **Actual tools:** arithmetic/conversions, statistics, CSV/text analysis, line-occurrence differences and forward chaining over explicit JSON premises/rules. All are bounded, cancellable and allowlisted, with typed completed/rejected outcomes. CSV formulas are inert; deduction does not assume the converse, closed-world truth or independently verified premises.
- **Diagnosis:** reported working browsers/network, affected subjects, corrections, attempted checks and outcomes persist. Checks include a reason, preparation and bounded interpretation. Persistent deletion/reset is excluded from automatically selected reversible checks. Reported improvement is not proof of a root cause.
- **Knowledge:** 708 core + 120 optional = **828 distinct records**, 3,067 expressions, 75 workflows and 560 terminal paths. Eight core computing/AI concepts and a lazy 16-record science pack add distinct content. Coverage, relationships and expression ownership validate; broader source-claim review remains open.
- **Context and memory:** scoped references, comparison follow-ups, steps/detail requests and corrections retain the supported topic. Explicit language/familiarity preferences are bounded, reviewable and selectively removable. Memory is off by default. Optional persisted fields validate without discarding historical messages.
- **French:** authored definitions for seven concepts and explicit arithmetic/percentages, with a French scope response for unsupported questions. This is not a general translation or French diagnostic system.

Both multi-operation examples in `max` have acceptance coverage: CPU cache + percentage + RAM/SSD; and WebGPU + a three-technology comparison + each technology's AI role. These are bounded working paths, not unrestricted reasoning.

## Documents, research and generation

Up to four local files can be selected. TXT/MD/JSON/CSV/LOG allow 100,000 bytes each. PDF/DOCX allow 2,000,000 input bytes and at most 100,000 extracted bytes; PDFs are limited to 40 pages. A packaged worker handles parsing/indexing, cancellation and a 15-second timeout. Optional binary parsers load on first use and can then be reused offline. Failed imports preserve existing documents.

PDF.js extracts text and physical page locations; images, scripts, forms and attachments do not execute. Scans need OCR, which is not implemented. Reading order/layout can differ from rendering. DOCX validates ZIP directory/header consistency, entry counts, expansion ratios, expanded sizes and the main XML checksum; only the main document XML is inflated. Saxes rejects DTD/entity declarations. External relationships and embedded packages are not fetched. File/page/time limits are not an operating-system memory quota for PDF decoding.

Chunks retain sections and matching line/page citations. Summaries select passages rather than claiming semantic comprehension. Multi-document comparison identifies conflicting explicit key/value fields with locations; it does not establish free-form contradiction or causation. Original documents remain tab-local; requested excerpts and drafts follow normal chat retention.

Research is off by default. Wikimedia supplies literal public extracts and actual revision metadata when available. An explicitly named `/research mdn TOPIC` selects an allowlisted GitHub-backed MDN compatibility provider for WebGPU, WebGL, WebAssembly, service workers or IndexedDB. It retrieves two immutable file revisions and compares displayed top-level browser-support fields. Flags, partial implementation, prefixes and unresolved aliases remain visible. Publication dates are not invented; edits are not browser releases, and compatibility records are not a device probe. Results have separate attribution, dates, cache provenance and removable local caching. Arbitrary URL fetching and hidden proxies are absent.

[Deep Mode](GAMMA4-ADVANCED-MODE.md) is an experimental CPU/WASM research-preview drafting path for explicit `/deep` requests after separate download consent. The model receives bounded selected evidence, not unrestricted chat history. Output is inert text. Validation checks structure, bounds, source IDs, exact quotations from every supplied source, unsupported numbers and links. It **does not establish entailment**. Invalid drafts fall back to Core evidence; generated content cannot dispatch tools. Setup has actual progress, stop/retry, session isolation and selective cache removal. Only 2/8 real Qwen probes passed validation; manual review still found missing caveats/disagreement. Setup states that Core is recommended. Large inference code and weights stay outside the default shell and MV3 package.

## Architecture and dependencies

`request.ts`, `query.ts`, `answerability.ts`, `evidence-selection.ts`, `requirements.ts` and `engine.ts` separate interpretation, retrieval, support, operations and composition. `comparison.ts` supplies authored dimensions. `data-tools.ts`, `capabilities.ts`, `natural-tools.ts` and `trusted-tools.ts` share the bounded execution contract. `check-policy.ts` informs diagnostic planning.

`documents.ts` owns chunks, indexes, extracts, citations and comparisons. `document-runtime.ts`/`document-worker.ts` own lifecycle; `document-binary.ts` lazy-loads `document-pdf.ts` and `document-docx.ts`. `DocumentImport.tsx` manages tab-local selection. `mdn-provider.ts` owns the named provider; `public-sources.ts` validates/cache-separates evidence. Shared persisted source validation accepts only the specific immutable MDN paths and existing Wikipedia paths.

`deep-config.ts` pins and validates the generation contract; `deep-worker.ts` runs local inference; `deep-runtime.ts` owns lifecycle; `deep-answer.ts` selects evidence and validates output; `DeepSetup.tsx` provides explicit setup. `memory.ts`, `context.ts`, `types.ts` and storage validation retain migration compatibility.

New parser dependencies are pinned: PDF.js 6.4.299 (Apache-2.0), fflate 0.8.3 (MIT), saxes 6.0.0 (ISC, with xmlchars). Existing Transformers.js 3.8.1 is reused. Sharp is pinned/overridden to 0.35.5 for Node image tooling, resolving two high dependency findings without changing the browser inference runtime; the resulting production dependency audit reports zero findings. No account, backend, API key, telemetry, private-document upload or new extension permission was introduced. Extension PDF/DOCX parsing uses packaged code; optional model executables are removed from the MV3 build.

## Accuracy and evaluation integrity

The published fixture is regression data. Expected-record acceptance is not independent factuality, and syntactically valid citations are not entailment.

| Published default regression      | Reproduced baseline |         Current |
| --------------------------------- | ------------------: | --------------: |
| Supported acceptance              |      91/256 (35.5%) |  93/256 (36.3%) |
| Unsupported false acceptance      |               3/100 |           0/100 |
| Accepted-answer label correctness |      91/101 (90.1%) |  93/100 (93.0%) |
| Correction/reference completion   |              42/100 |          42/100 |
| Complete two-topic responses      |               8/100 |          12/100 |
| Recall@10                         |     121/256 (47.3%) | 181/256 (70.7%) |
| Adversarial no-effect checks      |               50/50 |           50/50 |

Real pinned MiniLM scores replayed into the current engine yield **99/256 (38.7%) supported acceptance**, 0/100 unsupported false accepts, 93.4% accepted label correctness and 83.6% Recall@10, with zero missing queries. Historical hybrid acceptance was 49.2%, false acceptance 4% and Recall@10 70.3%. Support checks reduce accepted coverage while improving false acceptance; that tradeoff is not concealed by relaxed labels or thresholds. See [current default](gamma4/completion-regression.json) and [hybrid replay](gamma4/completion-hybrid.json).

A newly authored 40-case fixture was frozen before its first execution. Its first-use results were 8/16 supported, 7/8 correct unsupported abstentions, 7/8 conversations and 8/8 complete composed responses, with 75% lexical Recall@10. It was authored by the implementer, is a small purposive sample and is **not independent evaluation**. All compound tasks must independently cite their expected sources.

That first run exposed an access request incorrectly answered with adjacent keyring guidance. A general access-operation guard was then added. The original [first-use report](gamma4/completion-unseen.json) and fixture remain intact; the [post-review report](gamma4/completion-post-review.json) is explicitly exposed regression data, with unsupported abstentions now 8/8 and other counts unchanged. No production aliases or relaxed thresholds were added for the fixture. The previous implementation scored 6/8 conversations on the same fixture. Real MiniLM replay after review has the same category counts and zero missing queries; its reported Recall@10 field remains lexical. See [previous stage](gamma4/completion-previous.json) and [new hybrid replay](gamma4/completion-new-hybrid.json).

The earlier frozen 24-case set remains 23/24, up from 6/24 at baseline; its remaining failure is a part-count marker for a correctly blocked lookup. The separate development capability suite passes 20/20. Neither is a new holdout. Zero unauthorized network calls occurred in these offline engine evaluations.

## Verification and boundaries

Current verification includes **3,559 unit tests**, **90 production browser cases** across desktop/mobile Chromium viewports, and **21 extension checks**, including actual PDF/DOCX import under the shipping MV3 manifest. TypeScript, branding, knowledge validation, both builds and unchanged startup budgets pass. Final CI runs the full suite on the pushed commit.

The five MDN topics passed actual provider retrieval; WebGPU also passed a production Chromium UI/CORS lookup with three public requests and no requests before opt-in. Mocked provider tests cover cache fallback, removal, malformed metadata, bounded responses and qualification preservation. Document tests cover offline parser reuse, page citations, ZIP corruption/bombs, inert instructions, cancellation and preservation after failure.

The current MiniLM browser run indexed 708 records in 36,833 ms and measured all 70 new evaluation queries (median 16.1 ms, P95 65.3 ms); offline reuse and selective removal passed. Earlier real scores cover the entire published regression and its engine subqueries. Model-generation measurements and the rejected candidate's raw results are in the [advanced-mode report](GAMMA4-ADVANCED-MODE.md). These are container CPU measurements, not physical-device certification.

Startup stays below the original **650,000 raw / 210,000 gzip JavaScript** limits. Final entry JavaScript is **478,341 raw / 149,202 gzip bytes**, and shell precache is **1,027,288 bytes**. Five fresh-browser samples measured median composer readiness **322.3 ms**, visible answer **196.4 ms**, and post-answer JavaScript heap **10,288,980 bytes**. All samples are in [performance-after.json](gamma4/completion-runtime/performance-after.json). Heap snapshots are not peak process or inference memory; this is not a controlled before/after speed experiment.

## Remaining scope

Implemented paths are complete within their stated bounds. The following ambitions from `max` remain unmet:

- General language semantics, entailment, calibrated confidence and universal conditional/constraint reasoning; the requested broad acceptance/conversation/composition targets are not achieved.
- Independent evaluation and source-claim/citation-entailment review. First-use implementer-authored fixtures cannot establish independence.
- General document contradiction/causation detection, OCR, complex-layout fidelity, persistent large-document workspaces and arbitrary website research.
- Reliable general-purpose generation, physical mobile testing, Firefox/Safari certification, measured peak model/process memory, successful WebGPU inference and MV3 inference certification. The optional CPU draft mode is experimental.

## Reproduce

Use Node 22.13+ or 24. Run `ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci`, `npm run check:brand`, `typecheck`, `validate:knowledge`, `test`, `build`, `check:payload`, `build:extension`, `test:e2e` and `test:extension`. Use packaged Playwright Chromium for extension validation. Do not rebuild the shared production preview while browser/model tests are running.

```sh
npm run evaluate:intelligence -- /tmp/default-regression.json
npm run evaluate:gamma4 -- /tmp/earlier-frozen-set.json
npm run evaluate:capabilities -- /tmp/capabilities.json
npx tsx scripts/evaluate-completion.ts /tmp/completion-regression.json
# Start a production preview; these explicitly authorize public/model downloads:
node scripts/smoke-research.mjs --network
npm run test:deep:real -- --download
GAMMA_REPORT_DIR=docs/gamma4/completion-runtime/new-semantic GAMMA_EXTRA_QUERIES=docs/gamma4/completion-runtime/new-semantic/queries.json npm run test:gamma:real
GAMMA_COMPLETION_SCORES=docs/gamma4/completion-runtime/new-semantic/semantic-extra-scores.json npx tsx scripts/evaluate-completion.ts /tmp/new-hybrid.json
GAMMA_REPORT_DIR=docs/gamma4/completion-runtime GAMMA_SCORES=docs/gamma4/final-runtime/heldout-semantic-scores.json GAMMA_EXTRA_SCORES=docs/gamma4/final-runtime/semantic-extra-scores.json npm run evaluate:semantic-heldout -- /tmp/published-hybrid.json
GAMMA_REPORT_DIR=docs/gamma4/completion-runtime npm run measure:gamma
```
