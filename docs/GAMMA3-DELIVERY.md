# Gamma 3.0 foundations — delivery and remaining release gates

This is a tested first implementation milestone of the current `max` specification, **not completion of Gamma 3.0**. It implements candidate discovery, bounded request composition, local calculations, technical-text analysis and sourced comparisons. It deliberately retains the Gamma 2.0 product version until the broader intelligence release gates are met. Work started from `d596b1c` on 2026-10-25.

## Repository audit and implementation plan

The repository has 700 records, 2,811 expressions, 75 workflows, 560 terminal paths and 300 authored conversation scenarios. The source confirms that `hybrid.ts` previously reranked only lexical candidates, `engine.ts` had a two-topic composition branch, `language.ts` supplies bounded English rules, and `context.ts` expires topic references while preserving a diagnosis. Existing embeddings already search the full index in a worker; the missing step was admitting new record IDs in the coordinator. Storage validates optional metadata without a schema migration. Madon inference remains a separate lazy engine.

The current source deploys at `/cole/`, despite older documents and `max` referring to `/varek/`. This change preserves `/cole/`. An independently built `/varek/` artifact was also tested for startup and cached offline calculations. Storage/cache compatibility identifiers remain `varek`-prefixed.

| Area                       | Implemented milestone                                                                            | Prioritized remaining work                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Audit and baseline         | Actual checks and measured pre-change reports                                                    | Independent editorial and browser/device review                                           |
| Understanding/retrieval    | Typed tasks, dependencies, technical entities; semantic candidate union and clarification        | Robust observation/negation representation, full calibrated fusion, multilingual handling |
| Knowledge architecture     | Existing 700 reviewed records preserved                                                          | Domain packs, explicit typed relationships, distinct new content, provenance validation   |
| Reasoning/composition      | Up to six parts; sourced two-record comparisons; deterministic math                              | General bounded evidence operators, multi-hop relationship traversal, structured planner  |
| Context/diagnostics        | Last browser/OS correction wins; confirmation checks platform applicability                      | Task stack, persistent user-controlled memory, correction-aware adaptive checks           |
| Tools/information analysis | Typed read-only calculator and JSON/log analyzer                                                 | Permission-aware observation registry, document import/search, improved page extraction   |
| Public sources             | Existing explicit opt-in behavior preserved; compound network actions require a separate request | Provider interface, freshness/cache controls, multi-source extractive composition         |
| Release                    | Unit/browser/extension/offline/real-WASM validation and reports                                  | Held-out benchmark, budget recovery, physical-device validation                           |

## New user-visible behavior

- `Explain WebAssembly and calculate 15% of 240` produces both answers in numbered parts; compound requests retain supported answers and explicit unsupported responses.
- `/calculate (2 + 3) * 4`, `Calculate 15% of 240`, and `Convert 2 hours to minutes` perform actual local arithmetic. Supported units include decimal/binary byte units, durations, lengths, mass and C/F/K temperatures.
- `/analyze {"Name":"Cole"}` validates and pretty-prints JSON without changing key/value case. Multiline logs identify exact browser/HTTP/JavaScript error identifiers with line positions. This is syntax/identifier analysis, not an application schema validator or automatic diagnosis.
- `/compare WebGPU | WebGL` and `Explain WebGPU and compare it to WebGL` juxtapose accepted authored records, sources and review dates. Existing fixed comparisons remain compatible. No inferred causal relationship or comparative performance claim is generated.
- A sufficiently separated semantic neighbor can enter a clarification even when lexical retrieval omitted it. Selecting the suggested authored topic produces the answer, with platform validation. A similarity score alone cannot auto-accept that candidate.
- `I’m using Safari—actually, it’s Firefox` retains Firefox. The same last-entity correction applies to OS statements. Unrelated context remains intact; existing diagnostic invalidation behavior is preserved.

## Architecture and extension points

`request.ts` creates a typed English request with task intents, entities, exclusions, technical identifiers and adjacent-task dependencies. It splits explicit question/verb boundaries, not every occurrence of “and”. Commands and analyzed text are opaque. At most six tasks execute; omitted parts are explicitly reported. Reference substitution is limited to a preceding API/browser entity. Unresolved references ask for clarification. This is not a general language parser.

`engine.ts` runs each supported part through existing routing and combines the actual results/evidence. It does not run commands or public lookups embedded in a compound request. Individual requests still use existing command and consent paths. A compound message counts as one context turn. Only one final task/diagnosis context is retained: maintaining multiple parallel diagnoses is a remaining limitation.

`rerank.ts` validates semantic IDs, finite cosine range and uniqueness, then unions eligible full-index neighbors with the lexical set. Existing exact matches, dangerous requests and exclusions retain lexical behavior. Risk metadata, technical errors and available browser/OS constraints filter discovery candidates. Existing lexical acceptance and small semantic boosts are preserved. New candidates use a below-acceptance utility and a reciprocal semantic-rank tie-break; this is **not a newly calibrated full reciprocal-rank fusion model**. Discovery currently uses a provisional cosine floor of 0.60 and top-neighbor gap of 0.06, considers at most three new candidates, and always asks the user. These values are conservative heuristics, not probabilities or certified thresholds. The real-model worker still returns eight neighbors.

Do not relax automatic acceptance based on these development results. Maintain an independently authored held-out set and report acceptance, abstention, recall, unsafe matches and subgroup applicability before enabling automatic semantic-only answers. Existing index fingerprints, pinned model/hash, consent, worker cancellation, timeout, cache removal and lexical fallback remain unchanged.

`capabilities.ts` registers closed, synchronous, local operations with typed names, environment, permission, consent, side-effect and size metadata. New capabilities must be registered explicitly, bounded, validated and covered by meaningful response/security tests. This registry currently supports **only read-only local processing**; adding privileged or asynchronous operations needs an explicit execution-boundary design. Signals are checked before/after work; synchronous computation cannot be interrupted midway.

`calculator.ts` uses a recursive-descent grammar, never `eval`, JavaScript functions or property access. Input is limited to 500 characters, 150 tokens and nesting depth 24. Finite results are capped at magnitude 1e15 and displayed to 12 significant digits. Percent is postfix division by 100, with a separate “percent of” form. Unit dimensions must match; temperature conversions reject below-absolute-zero inputs. It uses floating-point arithmetic, not exact symbolic or financial math. Unit spelling and case are explicit.

Analysis is bounded to 16,000 characters and 24 reported identifier occurrences. JSON is parsed as data, never merged into configuration. Code fences exceed any embedded backtick sequence. Logs are never recursively dispatched to the engine. No analysis data leaves the browser; it remains subject to the existing conversation-history retention rules. Delete the conversation to remove its saved input/output.

`compare.ts` accepts two high/moderate lexical matches and composes their actual authored statements. It validates platform applicability and preserves safety notes. Related-record graph reasoning is not yet implemented. Add knowledge using the existing typed data modules and validator described in `GAMMA.md`; no new records or fabricated review dates were introduced.

`text.ts` isolates pure normalization/tokenization/edit-distance helpers. Gamma no longer initializes the legacy matcher's duplicate corpus index merely to normalize text. The legacy matcher exports and Madon behavior are preserved.

## Measured before and after

Reports are under [`gamma3/`](gamma3/). Historical Gamma 2 reports remain unchanged.

| Check                                                |          Before |           After |
| ---------------------------------------------------- | --------------: | --------------: |
| New response-level development checks                |            3/22 |           22/22 |
| Existing lexical accepted intent accuracy            |   22/26 (84.6%) |   22/26 (84.6%) |
| Existing real hybrid accepted intent accuracy        |   23/26 (88.5%) |   23/26 (88.5%) |
| Existing lexical/hybrid Recall@3                     |   24/26 (92.3%) |   24/26 (92.3%) |
| False accepts among 12 unsupported development cases |               0 |               0 |
| Unit tests                                           |           3,331 |           3,389 |
| Production browser tests                             |              46 |              54 |
| Extension checks                                     |              13 |              13 |
| Initial JavaScript bytes                             |         815,496 |         825,644 |
| Initial gzip bytes                                   |         262,048 |         265,941 |
| Median composer ready (five fresh contexts)          |        297.8 ms |        302.1 ms |
| Median reduced-motion answer visible                 |         67.3 ms |         61.5 ms |
| Median CDP JS heap snapshot                          | 9,490,236 bytes | 8,198,396 bytes |

The new cases are development checks used during implementation, **not held-out quality evaluation**. The final case file was also run against an isolated checkout of the original commit. Passing 22/22 does not establish broad natural-language understanding. The original 38-case benchmark did not improve accepted-answer accuracy. No 10-point held-out improvement, 2% general false-accept bound, 90% correction success rate, or completed 600-case benchmark is claimed.

Payload grew by 10,148 bytes (1.24%) / 3,893 gzip bytes. It remains above the unchanged **650,000 / 210,000** budget. No domain lazy-loading or budget recovery is claimed. Optional semantic/WASM/Madon inference assets remain outside initial shell precache; both production base-path smoke tests assert this. The main bundle has no additional eager JavaScript imports; measurement remains the entry asset size. CDP heap is a snapshot, not peak process/model memory. Container timings are noisy and do not establish physical-device speedups.

Real MiniLM/WASM testing initialized all 700 vectors, ran 38 queries, reinitialized from cached assets offline and removed only the enhancement cache. Setup measured 31,005 ms; query median 18.6 ms, P95 80.1 ms in that run. Integration tests separately inject semantic-only neighbors to verify the new clarification/selection boundary; the small real-model benchmark does not certify semantic-only paraphrase recall.

## Verification and reproduction

Passed: `check:brand`, `typecheck`, `validate:knowledge`, `test`, `evaluate:gamma`, `evaluate:gamma3`, website and extension builds, `test:e2e`, `test:extension`, `test:gamma:real`, `measure:gamma`, and production base-path/offline smoke tests. Unit tests cover invalid math, dimensions, nesting, JSON injection, case preservation, cancellation, semantic failure, malformed neighbors, unsupported compound parts and applicability after selection. Browser tests check rendered responses, literal JSON, no external requests, offline tools/comparisons and semantic clarification. Existing migration/storage/security tests still pass.

```sh
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci
npm run check:brand
npm run typecheck
npm run validate:knowledge
npm test
npm run evaluate:gamma
npm run evaluate:gamma3
npm run build
npm run build:extension
npx playwright install chromium
npm run test:e2e
npm run test:extension
# In a separate terminal:
npm run preview -- --port 4173
# Against that preview:
npm run test:gamma:real
npm run measure:gamma
node scripts/smoke-base.mjs
```

The real semantic test explicitly downloads the optional pinned model. `scripts/smoke-gamma.mjs` now opens the Assistant setup disclosure before looking for its buttons; the previous script timed out before inference. System Chromium did not load the extension service worker here; the Playwright Chromium binary passed all checks. Use `CHROMIUM_PATH` to select a compatible binary. The ordinary dependency install attempted an unused CUDA download and failed; the repo's existing documented CUDA-skip flag resolved installation. These environment/setup failures were rerun successfully, not counted as engine failures.

To reproduce the alternative base-path check without changing deployment configuration:

```sh
npx vite build --base=/varek/ --outDir /tmp/cole-varek/dist
(cd /tmp/cole-varek && node /absolute/path/to/cole/scripts/service-worker.mjs)
npx vite preview --host 0.0.0.0 --base=/varek/ --outDir /tmp/cole-varek/dist --port 4174
VAREK_PREVIEW_URL=http://127.0.0.1:4174/varek/ node scripts/smoke-base.mjs
```

That alternate artifact verifies core Gamma and offline behavior; optional semantic WASM assets are not copied there. Standard production builds copy those assets and the real semantic test uses `/cole/`.

## Migration, privacy and compatibility

No IndexedDB version, store, preference key, knowledge/workflow ID, model ID, extension permission, theme, appearance, export format, or Madon runtime/configuration changed. Added candidate/request fields are ephemeral. Existing conversations load unchanged. The `AssistantEngine` contract remains intact. Only calculator/analyzer command payloads now preserve case and multiline content; legacy commands still normalize arguments.

No accounts, telemetry, hidden inference, extra host permissions, shell execution, arbitrary JS execution, background-tab reading, private file access or new network provider was added. Calculations and source/document contents cannot grant permission. Semantic-only suggestions do not bypass explicit topic selection or applicability checks. Analysis does not claim to fix a device or verify a cause. Existing browser API exposure remains distinct from successfully obtaining an adapter. Main is not merged and no deployment is performed.

## Next milestones

1. Create and freeze the independent 250-supported/100-unsupported/100-conversation/100-compound/50-safety benchmark, including source validity, Recall@10 and task completion. Calibrate candidate fusion against development data, then measure the untouched benchmark.
2. Move authored domains and indexes into cacheable packs with explicit download/delete controls and restore the initial payload budget. Add substantial distinct knowledge with relationships, provenance and editorial validation.
3. Introduce an evidence/task state model, bounded relationship operators, a planner with reversible check ordering, and correction-aware continuation without losing parallel goals.
4. Extend permission-aware browser observations, document import/passage search, page extraction and explicit public-source synthesis. Finish user-controlled persistent memory only with storage migration/retention tests.
5. Validate target mobile/Safari/Firefox devices, actual toolbar activeTab gestures, peak inference memory and CPU limits before calling Gamma 3.0 release-ready.
