# Gamma 4.0 implementation and delivery

This branch delivers an integrated upgrade across request interpretation, evidence acceptance, task composition, local tools, diagnosis, knowledge, documents, research metadata and explicit personalization. It runs in the existing website/PWA and Chromium extension. The full ambition and numerical quality gates in `max` are **not all achieved**; remaining gaps are listed below. Gamma remains deterministic, and Madon remains separately selected.

The [initial audit](GAMMA4-AUDIT.md) records original findings. Baseline: `1a30900`; earlier implementation commits: `cdb9611` and `2ed3a54`. Reports prefixed `final-` and `final-runtime/` describe this delivery. Earlier reports and historical Gamma 3 artifacts remain preserved. [Review PR #6](https://github.com/hiyroscript/cole/pull/6) is not merged or deployed.

## Implemented capabilities

| Area                        | Working implementation and boundaries                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requests and composition    | At most six typed tasks with intents, entities, subjects, constraints, dependencies and capability requirements. Coordinated explanations/comparisons retain contrasts and corrections. Successful comparison sources resolve a subsequent “each” AI-use question. Quoted and structured payloads stay opaque, including polite tool requests. Each part has its own outcome and sources. Commands/public lookups in a compound message require separate invocation.                                                                                                                                                                  |
| Retrieval and acceptance    | General framing/abbreviation normalization; original exact matches retained; cached answer-field discovery; independent checks for a central subject and coherent supporting passage. Similarity/utility are never probabilities. An unsupported measurement, mutation or current fact cannot be fulfilled by a related explanation.                                                                                                                                                                                                                                                                                                  |
| Actual local operations     | Natural language and `/calc`, `/analyze`, `/stats`, `/csv`, `/text`, `/diff`, `/logic` share a bounded allowlist and typed outcomes. Statistics use Welford variance with population/sample deviations. CSV handles quoted commas/newlines/doubled quotes, shape, missingness and wholly numeric columns. Text counts distinguish Unicode points, UTF-16 and UTF-8. Diff compares line occurrences, not semantics or edit order. Logic performs bounded forward chaining with actual rule provenance from explicit JSON premises; no converse, contraposition, closed-world assumption or truth verification. No arbitrary execution. |
| Diagnosis                   | Browser contrast, reported working network, corrections, platform and constraints survive continuation. Checks include risk, preparation, a reason and bounded outcome interpretation. Persistent deletion/reset steps are excluded from automatic reversible plans. References identify the selected check's source. Related explanations remain hypotheses; no root cause or hardware measurement is invented. Existing workflows remain compatible.                                                                                                                                                                                |
| Knowledge                   | **708 core + 120 optional = 828 records; 3,067 expressions.** Eight distinct core records add CPU cache, SSD and browser AI concepts. A lazy 16-record `science` pack covers physical, chemical, biological and statistical reasoning. Existing 75 workflows/560 terminal paths remain. Installation/removal stays explicit; updates follow app versions without deleting a working pack. Counts, relationships and expression ownership pass validation.                                                                                                                                                                             |
| Documents                   | Up to four TXT/Markdown/JSON/CSV/log files, each at most 100,000 bytes. A packaged cancellable worker creates section/line chunks; a cached inverted index ranks passages. Citations identify the matching line. Extractive summaries include opening material and selected findings/conclusions. Multi-document comparison identifies differing explicit key/value fields with filenames/lines, without claiming free-form contradiction detection. Imports stay tab-local; requested excerpts follow chat retention. Failed/excessive selection preserves existing documents. Offline import/removal is tested.                     |
| Research                    | Explicit opt-in Wikimedia provider/public-only query filter remain. Results retain literal attribution, retrieval time, cache provenance and validated article-revision timestamps when supplied. Publication dates are unavailable. A recent retrieval/revision does not prove current support, agreement or version changes. Cached fallback and separately removable cache remain.                                                                                                                                                                                                                                                 |
| Context and personalization | Scoped comparison follow-ups do not intercept unrelated diagnostic questions. Explicit memory adds bounded language/familiarity preferences and field-specific forgetting. Memory is off by default; no automatic freeform profile. Optional fields validate without a database migration; malformed optional state does not discard messages.                                                                                                                                                                                                                                                                                        |
| French                      | Tested authored definitions for DNS, WebGPU, WebGL, WASM, cookies, CPU cache and SSD, plus explicit arithmetic/percentages. Unsupported requests receive a French scope explanation. This is a staged path, not a general translator or French diagnostic engine; other tools still need English.                                                                                                                                                                                                                                                                                                                                     |
| Optional intelligence       | Real pinned MiniLM CPU/WASM retrieval works on the expanded corpus. Generation candidates and runtime constraints are documented in [the advanced-mode investigation](GAMMA4-ADVANCED-MODE.md). No unverified Gamma generation feature or silent Madon substitution is shipped.                                                                                                                                                                                                                                                                                                                                                       |

Both multi-operation examples in `max` are tested: CPU cache + percentage + RAM/SSD, and WebGPU + three-technology comparison + each technology's AI role. Report summarization cites source sections. Imported instructions cannot dispatch tools. These demonstrate bounded capabilities, not unrestricted reasoning.

## Architecture and source changes

`request.ts`, `query.ts`, `answerability.ts`, `evidence-selection.ts`, `requirements.ts` and `engine.ts` separate parsing, discovery, support and execution. `comparison.ts` projects authored dimensions over successfully selected subjects. `data-tools.ts` contains pure bounded operations; `capabilities.ts`, `trusted-tools.ts`, `natural-tools.ts` and the command registry expose one execution contract. `check-policy.ts` supplies safety/information criteria to `reasoning.ts`.

`documents.ts` owns parsing, chunks, indexes, extracts and literal comparison. `document-worker.ts`/`document-runtime.ts` own indexing/cancellation; `DocumentImport.tsx` manages selection/progress/errors/removal. The engine accepts multiple documents while preserving the older single-document option. The extension uses the same packaged code without new permissions.

`french.ts` contains bounded French responses. `memory.ts`, `types.ts`, `context.ts` and `storage.ts` validate optional preferences/comparison frames. `gamma4.ts` and `packs/science.ts` add knowledge. `public-sources.ts` and the shared Wikimedia client preserve actual freshness metadata. No account, telemetry, backend, new dependency, remote executable code or private-document upload was introduced.

## Accuracy and safety measurements

The published fixture is regression data, not an unseen final holdout. Accepted-answer label correctness measures expected record IDs among accepted answers, not independent factuality. Citation URL validity is not entailment.

| Published default regression      | Reproduced base |           Final |
| --------------------------------- | --------------: | --------------: |
| Supported acceptance              |  91/256 (35.5%) |  93/256 (36.3%) |
| Unsupported false acceptance      |           3/100 |           0/100 |
| Accepted-answer label correctness |  91/101 (90.1%) |  93/100 (93.0%) |
| Correction/reference completion   |          42/100 |          42/100 |
| Complete two-topic answers        |           8/100 |           9/100 |
| Recall@10                         | 121/256 (47.3%) | 181/256 (70.7%) |
| Adversarial no-effect completion  |           50/50 |           50/50 |

New real MiniLM scores on 708 records, plus all 14 engine subqueries, replayed into the final engine give **99/256 (38.7%) acceptance, 0/100 unsupported false accepts, 93.4% accepted label correctness, 83.6% Recall@10, zero missing score queries**. Historical hybrid acceptance was 49.2%, false acceptance 4%, Recall@10 70.3%. Requiring support beyond similarity improves false acceptance and recall but reduces accepted coverage. This regression is explicit; thresholds/fixture labels were not loosened. Replay does not measure inference latency.

The earlier frozen 24-case implementer-authored set remains **23/24**, up from 6/24 at baseline. Its remaining failure is a part-count marker on a correctly blocked public-lookup part, with no unauthorized effect. It was prospective before first execution, is now exposed regression data, and was never independently authored.

The new **20/20 capability acceptance suite** covers tools, invalid inputs, document grounding/conflicts/injection, missing documents, French and composed technical scenarios. It was developed with the implementation and is not an unseen benchmark. CI runs it. The previous 22-case development suite also passes. These results remain separate from broad intelligence accuracy.

## Verification

- TypeScript, branding, knowledge validation, website/MV3 builds and unchanged payload budgets pass. Historical reports/frozen digests remain intact.
- **3,531 unit tests pass**, including 44 new capability cases in this stage. Existing storage, migration, Markdown, worker, permission and cancellation suites pass.
- **80/80 production browser tests pass** on the final build in desktop/mobile Chromium viewports. Earlier attempts found a table-whitespace assertion mistake (corrected to check actual cells) and a navigation failure caused by rebuilding the shared preview during testing. The final full run used a stable build and passed; neither earlier attempt is counted as passing.
- **19 extension checks pass**, including local statistics/deduction/French, shipping permission denial and the separate localhost extraction fixture. The fixture does not certify actual toolbar activeTab gestures.
- Offline reload, document-worker import/comparison, inert source instructions, removal, selection failure recovery and mobile horizontal-overflow checks pass. No optional model downloads by default.
- Actual MiniLM WASM indexed **708 records in 33,382 ms**; **356 queries**: median **11.6 ms**, P95 **57.6 ms**. Offline reuse and selective removal passed. A separate real 14-query run filled every engine subquery before final replay. These are container CPU results, not physical mobile measurements.
- The real generation probe returned **no compatible GPU adapter**. No generation, GPU speed/memory or offline-generation result is claimed.

Final startup JavaScript is **469,620 bytes raw / 146,757 gzip**; background shell precache is **1,008,374 bytes**. Five fresh production-browser samples measured median composer readiness **366.3 ms**, visible answer **202.3 ms**, and post-answer heap **10,322,572 bytes**, with full samples in [performance-after.json](gamma4/final-runtime/performance-after.json). Startup remains under **650,000 raw / 210,000 gzip bytes**. The report's old `baseline` field is Gamma 2, not this branch's base. This is not a controlled before/after speed experiment; heap snapshots are not peak process/model memory.

New source links were checked for availability; one obsolete SSD URL was replaced. Accessibility is recorded separately from editorial accuracy. Scientific claims include assumptions/limitations, but independent source-claim review remains open.

## Scope and remaining gates

- [x] Shared request/evidence/tool/context upgrade, separate task outcomes and payload isolation.
- [x] Statistics, CSV/text analysis, line comparison and explicit conditional deduction.
- [x] Diagnostic safety/value assessment and retained outcomes/corrections.
- [x] Computing/AI records, optional science content and validated ownership/relationships.
- [x] Cancellable multi-document indexing, line/section citations, extractive findings and literal conflicts.
- [x] Revision provenance, explicit bounded personalization and limited French path.
- [x] Real CPU semantic runtime, release/security/performance checks and generation investigation.
- [ ] Broad language semantics, general entailment, universal conditional/constraint handling and calibrated confidence. Legacy routes are not all proven under the new support contract.
- [ ] Requested acceptance/conversation/composition targets; small capability tests do not close these gaps.
- [ ] Independent untouched evaluation and source/citation entailment review; one implementer's fixtures cannot establish independence.
- [ ] General document synthesis/semantic contradictions, OCR/PDF/DOCX, large-document persistence and archive security. Export to supported text formats is the working alternative; no misleading parser controls are shown.
- [ ] Additional permitted research providers and version reconciliation. Arbitrary-site retrieval remains CORS constrained; no hidden proxy/backend is added.
- [ ] Gamma generation, supported-GPU/CPU-generation quality/resource evaluation, physical mobile, Firefox/Safari and MV3 inference certification. The investigation documents the blocker and integration requirements.

Implemented paths are complete within their tested bounds. These remaining items are unfinished parts of the larger `max` roadmap, not functionality hidden behind a cosmetic mode or a passing small benchmark.

## Reproduce

Run `ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci`, then `check:brand`, `typecheck`, `validate:knowledge`, `test`, `build`, `check:payload`, `build:extension`, `test:e2e` and `test:extension`. Use packaged Playwright Chromium for extension tests. Preserve baseline artifacts using explicit destinations:

```sh
npm run evaluate:gamma -- docs/gamma4/final-lexical.json
npm run evaluate:gamma3 -- docs/gamma4/final-development.json
npm run evaluate:intelligence -- docs/gamma4/final-regression.json
npm run evaluate:gamma4 -- docs/gamma4/final-known-cases.json
npm run evaluate:capabilities
# Production preview on port 4173; explicitly exercises optional assets:
GAMMA_REPORT_DIR=docs/gamma4/final-runtime GAMMA_HELDOUT=1 npm run test:gamma:real
GAMMA_REPORT_DIR=docs/gamma4/final-runtime GAMMA_EXTRA_QUERIES=docs/gamma4/final-runtime/heldout-semantic-missing.json npm run test:gamma:real
GAMMA_REPORT_DIR=docs/gamma4/final-runtime GAMMA_SCORES=docs/gamma4/final-runtime/heldout-semantic-scores.json GAMMA_EXTRA_SCORES=docs/gamma4/final-runtime/semantic-extra-scores.json npm run evaluate:semantic-heldout -- docs/gamma4/final-hybrid.json
GAMMA_REPORT_DIR=docs/gamma4/final-runtime npm run measure:gamma
```
