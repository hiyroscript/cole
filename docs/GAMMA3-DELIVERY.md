# Gamma 3.0 implementation and release gates

This follow-up implements the remaining bounded feature areas in `max`: optional knowledge packs, structured observations and evidence, adaptive diagnostics, suspended tasks, local documents, explicit preference memory, public-source freshness, semantic acceptance, and payload isolation. It follows the merged foundations PR #4. **The code is reviewable, but the broad intelligence quality targets are not all met.** The results below are release gates, not a claim of unrestricted reasoning or production quality certification.

The original baseline is `d596b1c`; the merged foundations baseline is `9a96ea5` (the same tree as `86f9360`). Historical Gamma 2 and foundations reports are preserved. Current reports use `*-after.json`, `heldout*.json` and `calibration.json` under [gamma3/](gamma3/).

## Verified capabilities

| Area             | Original Gamma 2                                    | Current behavior                                                                                                                  |
| ---------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Requests         | Narrow two-topic composition                        | Up to six explicit tasks, adjacent feature references, corrections, supported output retained alongside unsupported parts         |
| Retrieval        | Semantic reranking restricted to lexical candidates | Full-index candidate admission, weighted reciprocal ranks, separate acceptance and clarification gates                            |
| Knowledge        | 700 bundled records                                 | 700 built-in plus 104 distinct optional records in four domains; 804 total, 3,019 expressions                                     |
| Evidence         | Single authored answer or workflow                  | Bounded relationship traversal, source inspection, user facts and hypotheses distinguished, sourced comparison tables             |
| Diagnostics      | 75 authored workflows                               | Preserved workflows plus adaptive reversible-check selection, recorded outcomes, constraints, suspended/resumed tasks and reports |
| Tools            | Browser facts and fixed commands                    | Arithmetic/conversions, bounded JSON/log analysis, explicit adapter probe and a closed trusted-tool registry                      |
| Documents        | No selected local document                          | Local text/Markdown/JSON/CSV/log import, structural analysis and source-line passage retrieval                                    |
| Memory           | Conversation context                                | Explicit, disabled-by-default browser/platform/depth preferences with review, correction, disable and clear controls              |
| Public knowledge | Explicit Wikimedia lookup                           | Same provider and opt-in boundary, attributed extracts, retrieval timestamps, bounded fallback cache and independent deletion     |
| Startup          | 815,496 bytes JS / 262,048 gzip                     | 458,441 bytes / 142,683 gzip; unchanged 650,000 / 210,000 budget passes                                                           |

Useful requests:

- `Explain WebAssembly and calculate 15% of 240` or `/calculate 2 hours to minutes`.
- `/compare WebGPU | WebGL in a table`, then `/sources`.
- `Firefox keeps freezing when I watch videos, but Chrome works`, followed by `That didn’t help`, `/summary`, or `/reason hardware acceleration`.
- `/plan browser freezing`, `/plan video playback`, then `/plan resume` to recover the previous pending check.
- `/knowledge install programming`, then `How do closures work?`; `/knowledge remove programming` removes that pack from retrieval and its cached chunk.
- Import a small local document, then `/document summary` or `/document find milestone`.
- `/memory on`, `/memory save browser firefox`, `/memory`, `/memory off`, `/memory clear`.
- `/probe webgpu` actually requests an adapter. `/research WebAssembly` still requires `/web on`; `/research clear` deletes cached public extracts.

## Architecture and limits

`request.ts`, `language.ts` and `observations.ts` retain bounded English rules. They represent tasks, explicit dependencies, technical identifiers, exclusions, affected/working browsers, output preferences and temporal words. They do not provide general multilingual understanding. Explicit question/verb boundaries split requests; free-form narrative composition remains weak. An unresolved reference asks for clarification. Commands and supplied documents are opaque data. Compound requests cannot authorize commands or public lookups. At most six parts execute, with excess parts explicitly reported and authored source IDs retained.

`retrieval.ts` maintains an exact map, inverted index, phrase coverage and bounded lexical utility. Its index refreshes when installed record IDs change. `rerank.ts` preserves exact, dangerous and excluded-query behavior; validates semantic IDs and finite scores; checks record risk, exact error identifiers and available platform/browser metadata; and merges eligible candidates. Reciprocal-rank weights are 0.5/0.5 with denominator 60 plus rank. A reliable lexical decision takes precedence over fusion. Rank utility and cosine are not probabilities.

The 38 development queries were used for a 27-configuration calibration grid. All configurations retained 23/26 correct accepted answers and zero false accepts among 12 unsupported development queries; this small sample does not justify fine-grained parameter fitting. The selected semantic floor is 0.70 with a top-two margin of 0.10. Weaker separated neighbors at 0.60/0.06 can ask a clarification. New automatic semantic decisions also require the safety/applicability checks and an unreliable lexical decision. The independent evaluation exposes the policy's remaining false accepts. Enhanced understanding remains experimental, off by default and website-only; it never initializes Madon.

`semantic-worker.ts` uses the existing pinned MiniLM revision and artifact checksum. It returns ten neighbors, validates index fingerprints/dimensions/normalization, reuses vectors only when the ID and exact embedding text match, and keeps at most 64 query vectors. Pack installation invalidates the active semantic runtime; reinitialization incorporates installed records. Consent, single-flight initialization, worker termination on cancellation, retry, cache deletion and lexical fallback remain intact.

`reasoning.ts` traverses explicit/editorial relationships to at most four additional records and depth two, with cycle prevention. It presents attributed evidence and relationship paths. Connections are relevant explanations, not proof of causation. The planner ranks authored checks using transparent rule priorities, excludes known destructive operations and stated action exclusions, checks OS applicability, and tracks suggested/failed/helped/skipped outcomes. The browser-contrast check uses a temporary profile as a controlled comparison. There are no fabricated diagnostic probabilities, hidden measurements or verified-fix claims.

`case-state.ts` bounds facts to 32, checks to 24, sources to 12 and correction history to 16. Contradicted facts remain marked. An explanation detour retains the diagnostic case. Up to three suspended cases can be resumed. This is a bounded task stack, not arbitrary parallel agent execution. Original numeric flow states and all 75 authored workflows remain compatible. The generated workflow-node manifest lets storage validate conversations without importing all workflow content at startup; knowledge validation rejects a stale manifest.

`trusted-tools.ts` records input limits, environment, permission, consent and side-effect metadata and executes a closed switch over implemented operations. A new tool needs a registry entry, an explicit implementation, boundary tests and an appropriate permission path. Neither retrieved text nor a document can register or invoke a tool. Synchronous parsing cannot be interrupted mid-instruction; limits bound the work, with abort checks before and after. Pack loading checks cancellation before applying records or saving installation state. Storage failures do not claim success.

The calculator uses a recursive-descent grammar rather than JavaScript evaluation. It limits input to 500 characters, 150 tokens and depth 24, rejects nonfinite results, caps magnitude at 1e15 and formats to 12 significant digits. Units require compatible dimensions; temperature conversions reject values below absolute zero. It uses floating point, not symbolic or exact financial arithmetic. JSON/log analysis is limited to 16,000 input characters, with bounded formatting depth/nodes/output and escaped fences. It validates syntax and identifies technical errors, not application semantics.

`documents.ts` accepts at most 100,000 bytes of `.txt`, `.md`, `.json`, `.csv` or `.log`. It rejects binary NUL content, parses supported structure, returns opening extracts or at most five matching source lines, and treats formula-like cells and embedded instructions as inert text. Passage ranking is lexical, not a semantic document model. The original file stays in this tab's memory until removed or reloaded; requested excerpts saved in a conversation follow existing chat retention. It does not crawl folders, read unselected files, parse PDF/Office binaries or send documents to a provider.

`public-sources.ts` introduces a provider boundary around the existing Wikimedia retrieval implementation, without changing Madon's code. It retains at most 20 successful public-query cache entries. Cached fallback is only attempted after an explicitly enabled live lookup fails and is labeled stale. Composition selects literal sentences, keeps each source attributable and makes no unsupported cross-source conclusion. Retrieval time is not a source publication/update date. `/sources` distinguishes authored references from fetched public sources. Reference URL validation is not live availability or claim entailment verification.

## Knowledge authoring

The optional packs cover programming (42 records), mathematics/science (24), computer systems (18) and everyday technical work (20). They add distinct concepts including closures, cancellation, validation, statistics, measurement, file systems, CSV handling, spreadsheet references and source evaluation. Three overlapping drafts were removed rather than counted as new knowledge.

Add authored rows through `src/data/packs/schema.ts`, using stable `g3-` IDs, distinct titles/aliases, substantive explanations, safe steps, related IDs and an appropriate reference. `@id` links to an existing record. Optional typed relationships specify `related`, `requires`, `alternative` or `possible-cause` where useful. Add a lazy loader in `packs.ts`; do not import optional domains into the startup shell. Core data remains compatible with the original schema.

Run `validate:knowledge`: it loads all packs and checks duplicate IDs/titles/answers/expressions, low-information answers, alias ownership, safe reference URLs, review dates, applicability, risk notes, relationship integrity, reasoning links and every existing workflow graph. Review dates describe content review; no live source crawl or independent editorial certification is claimed. More exhaustive field-specific citations remain desirable before a broad knowledge release.

## Evaluation and unmet targets

The frozen fixture contains 606 cases: 256 distinct supported paraphrases, 100 unsupported queries, 100 composed correction/reference conversations, 100 composed two-topic requests, and 50 adversarial variations of ten attack seeds. It is separate from production aliases and development fixtures. All 256 supported inputs are unique and have **zero exact normalized title/alias overlaps**. The composed cases are not 250 independently authored scenarios, and the conversation score is context/intent completion, not verified diagnosis or repair success.

The committed SHA-256 is `1cd146c70004968097e788846ebc36c89fc700c87b8d3673325c2b5cc3f26d2b`. The evaluator checks it and never regenerates the fixture. The same fixture was run against isolated original and foundations checkouts. No individual held-out failure was used to add aliases, tune thresholds or simplify expected outcomes. Model-score replay is separate from measured inference latency.

| Frozen evaluation                                 | Original baseline | Current |
| ------------------------------------------------- | ----------------: | ------: |
| Default supported acceptance                      |             35.2% |   35.5% |
| Default unsupported false acceptance              |              3.0% |    3.0% |
| Default Recall@3 / Recall@10                      |             46.9% |   47.3% |
| Correction/reference scenario completion          |             41.0% |   42.0% |
| Complete composed two-topic answers               |              0.0% |    8.0% |
| Hybrid full-response supported acceptance         |             37.1% |   49.2% |
| Hybrid full-response unsupported false acceptance |              3.0% |    4.0% |
| Hybrid Recall@3 / Recall@10                       |             46.9% |   70.3% |

Hybrid full-response accuracy improves by 12.1 percentage points, meeting the gain objective, but false acceptance rises from 3.0% to 4.0%. The combined improvement-and-safety gate therefore **fails**. Default-mode improvement is only 0.4 points. The separate raw retrieval report (before response routing) measures 48.4% accepted accuracy and 5% false acceptance; it is not interchangeable with the full-response results. Final replay has zero missing model-score queries.

The default engine remains constrained by lexical candidate recall and conservative acceptance. The compound parser cannot decompose many natural narrative requests, and unsupported subparts prevent completion. Conversation evaluation depends on retrieving the initial topic, then retaining it through corrections and a steps request. These limits explain why the 90% conversation objective and reliable general compound handling are not met. Semantic matching increases coverage but does not establish that the supplied evidence answers the user's question, leaving false accepts above the 2% target. These gates are not waived.

The legacy 38-query development suite remains at 22/26 lexical and 23/26 hybrid accepted answers with zero false accepts among 12 unsupported requests. The 22 new tool/composition development checks improve from 3/22 at the original baseline to 22/22. Tests authored during implementation are regression checks, not held-out quality evidence. All 50 adversarial held-out cases pass their no-effect/no-network boundary checks. Citation checks in the response harness validate HTTPS URL syntax only; there were no emitted citations in that default fixture, so it provides no positive source-entailment evidence. Comparison/evidence/source rendering is separately covered by response and browser tests.

The next quality work is broader independently authored development coverage, more discriminating acceptance criteria, general task/reference parsing, richer evidence applicability and a new untouched evaluation set. Physical-device and independent editorial validation also remain outstanding. The current fixture is now a published regression set and must not be advertised as unseen in future tuning.

## Performance and verification

The entry plus all statically imported JavaScript is **458,441 bytes raw / 142,683 gzip**, down 43.8% raw from the original baseline. CI now enforces the unchanged 650,000 / 210,000 limits using the Vite manifest. Gamma code and the core index load on demand; optional domain chunks and inference assets are excluded from initial precache. **Background offline precache still transfers 966,215 bytes**, including core knowledge and workflows. The split does not make that offline cost disappear.

Five fresh production Chromium contexts measured median composer readiness at 289.5 ms (baseline 297.8), first answer visibility at 153.4 ms (baseline 67.3), and post-answer CDP heap at 8,108,332 bytes (baseline 9,490,236). The first-answer delay increased with the lazy engine/index import; this is an acknowledged tradeoff. These are unthrottled container observations, not physical-device speed guarantees. CDP heap is a snapshot, not peak browser/worker/model memory; peak inference memory and battery impact were not measured.

Real WASM testing indexed 700 records, initialized again offline from cached assets, inferred all 38 development queries and 356 held-out single-turn queries, and verified selective model-cache removal. The held-out run setup took 28,017 ms, query median 6.6 ms and P95 18.6 ms. Supplemental engine subqueries are collected with the same pinned model for complete response replay. Existing unit tests verify incremental vector reuse; a physical multi-pack model-memory stress test was not performed.

Passed: branding, TypeScript, knowledge validation, **3,424 unit tests**, **62 production browser tests**, **13 extension checks**, both production builds, development evaluation, frozen evaluation, payload enforcement, real WASM inference/offline cache reuse, and production offline smoke checks under `/cole/` and separately built `/varek/`. All real-model runs are Chromium/WASM CPU runs. Mobile Playwright uses a Chromium viewport, not iOS Safari. Real GPU model inference, physical mobile/browser matrices and a user's actual toolbar gesture remain outside this environment's verification.

An old browser test initially asserted that every semantic-only candidate must clarify. Its fixture was updated to the lower clarification range, while a separate response test verifies the new calibrated acceptance path. A supplemental smoke attempt failed because the local preview had stopped; it was restarted and rerun. These were recorded and resolved, not counted as passes. Standard installs use the repository's existing `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` flag to avoid an unused native CUDA download.

## Reproduction

```sh
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci
npm run check:brand
npm run typecheck
npm run validate:knowledge
npm test
npm run evaluate:gamma
npm run evaluate:gamma3
npm run evaluate:intelligence
npm run build
npm run check:payload
npm run build:extension
npx playwright install chromium
npm run test:e2e
npm run test:extension
# Keep this running separately:
npm run preview -- --port 4173
# Against that preview:
npm run test:gamma:real
npm run calibrate:gamma
GAMMA_HELDOUT=1 npm run test:gamma:real
npm run evaluate:semantic-heldout
# If replay reports missing subqueries, collect them and replay again:
GAMMA_EXTRA_QUERIES=docs/gamma3/heldout-semantic-missing.json npm run test:gamma:real
npm run evaluate:semantic-heldout
npm run measure:gamma
node scripts/smoke-base.mjs
```

For the original comparison, copy only the frozen fixture and evaluation scripts into a detached `d596b1c` worktree with dependencies installed, then run the same evaluators. Supply `GAMMA_SCORES` and `GAMMA_EXTRA_SCORES` with absolute score artifact paths for semantic replay. Do not copy upgraded engine code into that checkout. `scripts/build-heldout.ts` is a one-time authoring aid; do not rerun it as part of validation.

```sh
npx vite build --base=/varek/ --outDir /tmp/cole-varek/dist
(cd /tmp/cole-varek && node /absolute/path/to/cole/scripts/service-worker.mjs)
npx vite preview --host 0.0.0.0 --base=/varek/ --outDir /tmp/cole-varek/dist --port 4174
VAREK_PREVIEW_URL=http://127.0.0.1:4174/varek/ node scripts/smoke-base.mjs
```

The alternate artifact verifies startup and offline Gamma tools; standard production builds copy the optional WASM assets and use `/cole/`. Use `CHROMIUM_PATH` to select a compatible browser binary; the extension tests use Playwright's Chromium.

## Migration, privacy and review

IndexedDB version/store, existing preference keys, workflow/record/model IDs and extension permissions are preserved. Optional `case`, `pausedCases` and `authoredSources` context fields are bounded and validated; malformed optional metadata is removed while retaining legacy conversations. No stored chat rewrite is required. The `AssistantEngine` contract and Madon implementation are unchanged.

New opt-in selections/preferences use `gamma.knowledge.v1` and `gamma.memory.v1`. The public cache uses `gamma-public-v1`; existing offline and semantic caches retain their namespaces. `/memory off` stops applying saved values; `/memory clear` deletes them. Pack removal deletes the selection and matching optional chunk while preserving chat history; reload releases the JavaScript module from memory. `/research clear` deletes cached public results while saved excerpts remain in their conversations. Delete-all removes the new preferences/cache and selected document along with the existing app data.

There are no new accounts, telemetry, hosted inference, network providers, host permissions, private-file scans or arbitrary code/shell execution. Pack installation fetches static app assets after an explicit request; conversations are not sent. Public lookup uses the existing public-topic filter and opt-in boundary. Imported/page/public text cannot grant permissions or dispatch commands. The page reader adds a title and bounded headings to its existing activeTab extraction path; sender and permission checks are preserved. API exposure is explicitly distinct from a tested adapter, measured hardware load or a proven diagnosis.

This change is prepared on a dedicated follow-up branch for review. It is not automatically merged or deployed. Numerical quality gates and environmental limits remain visible to the reviewer rather than being described as completed release certification.
