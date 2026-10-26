# Gamma 4.0 — correctness foundations

This delivers a working subset of milestones A/B from `max`, not the full Gamma 4.0 release. The existing Gamma identity, separate Madon model, UI, storage schemas, commands, optional packs and permission boundaries remain compatible. See the [initial audit](GAMMA4-AUDIT.md).

## Implemented architecture

- `request.ts` creates at most six typed tasks with subjects, intent, entities, constraints, dependency references, required capabilities and missing information. It recognizes coordinated explanation subjects, polite question boundaries and comparisons without splitting ordinary comparison operands. Commands, JSON analysis, fenced data, quoted clauses and leading conditionals remain opaque. English rules remain bounded; this is not a learned parser or general multilingual understanding.
- `query.ts` rewrites general question framing and technical abbreviations. `retrieval.ts` preserves original exact matches, retains contrasts, and adds answer-field candidates below the existing lexical acceptance threshold as discovery-only results. These candidates improve recall without automatically becoming answers. Cached term sets keep answer discovery bounded.
- `evidence-terms.ts` normalizes grammatical framing and inflections while retaining unknown content words. `answerability.ts` separates direct term support, partial coverage, related evidence, conflicting applicability and unsupported identifiers. `evidence-selection.ts` can accept a single independently supported low-risk candidate without inflating its rank score: technical subjects must be central to the record, and the requested terms must be covered by a coherent passage or an authored expression with only a generic browser/site qualifier. Incidental mentions and unreconciled negative conditions cannot use this route. `rerank.ts` applies the same evidence contract to semantic candidates. No cosine or lexical utility is called a probability. This conservative contract cannot establish general semantic entailment and deliberately reduces acceptance of weakly grounded semantic answers.
- `engine.ts` resolves dependencies only after the previous task was answered; source IDs are cleared between parts and aggregated afterward. Typed per-task outcomes expose answered, needs-information and blocked states. Analysis/stage labels describe real dispatched operations. Compound tasks cannot grant permissions, invoke commands, or initiate web retrieval, even when the global web toggle is on.
- `natural-tools.ts` maps explicit user language to the existing allowlisted calculator and JSON/log analyzer. The same input limits, cancellation, error handling and non-executable parser apply. Tools return typed completed/rejected outcomes, so execution status no longer depends on response wording. Invalid JSON is a completed validation with an error finding; a failed arithmetic expression is rejected. Commands and structured tool payloads are routed before browser/platform/fact interpretation, preventing quoted corrections or outcomes from modifying an active case. Examples: “How much is 18% of 475?” and `Analyze this JSON: {"count":3}`. Source contents never re-enter task dispatch.
- `requirements.ts` identifies requests for measurements, mutations and current sources. Authored explanations cannot fulfill these execution requirements. Unsupported operations receive an explicit limitation without an invented result or unauthorized network request; educational “how do I” questions still reach guidance.
- `observations.ts` distinguishes affirmative browser statements from negated alternatives. Browser declarations no longer swallow a reported symptom. `reasoning.ts` avoids replaying obsolete facts after corrections; natural check explanations and task resumption preserve the pending check. Correcting Chrome to Edge retains the platform and issue. No system checks are claimed executed.
- `compare.ts` supports two through four distinct sourced subjects, including table output. This is attributed juxtaposition, not a general trade-off or causal reasoner.

## Measurements

Final follow-up reports use the `evidence-` prefix under `docs/gamma4/`; the earlier foundation reports remain preserved. Artifacts under `docs/gamma4/` are new; historical Gamma 3 artifacts remain intact. The published fixture is a regression benchmark, not a newly unseen holdout. Accepted-answer label correctness divides correct single-turn answers by all correct/incorrect accepted answers, including unsupported false accepts; it is separate from supported acceptance coverage and retrieval recall. This uses the fixture’s record labels, not an independent factuality review.

| Published regression metric                     | Reproduced base |  This milestone |
| ----------------------------------------------- | --------------: | --------------: |
| Default supported acceptance                    |  91/256 (35.5%) |  93/256 (36.3%) |
| Unsupported false acceptance                    |      3/100 (3%) |      0/100 (0%) |
| Accepted-answer label correctness (single-turn) |  91/101 (90.1%) |  93/100 (93.0%) |
| Correction/reference completion                 |    42/100 (42%) |    42/100 (42%) |
| Complete two-topic answers                      |      8/100 (8%) |      9/100 (9%) |
| Default Recall@10                               | 121/256 (47.3%) | 181/256 (70.7%) |
| Adversarial no-effect completion                |           50/50 |           50/50 |

Published historical hybrid acceptance was 49.2%, false acceptance 4%, Recall@10 70.3%. Replay of the existing real MiniLM scores through this milestone gives 38.7% acceptance, 0/100 unsupported false accepts and 83.6% Recall@10, with zero missing score queries. **Hybrid acceptance regresses because similarity alone no longer authorizes an answer.** This is an explicit conservative trade-off, not a claim that all quality metrics improved. Replay is not new model execution or an inference latency measurement.

The new frozen 24-case prospective set improves from 6/24 to 23/24, with zero unauthorized network requests. It covers natural calculations, explanations, coordinated tasks, references, corrections, diagnostics, comparisons, JSON and safety. It was authored by the implementer and frozen before execution, then run unchanged against the detached base and foundation implementation. The follow-up replays this now-exposed set as regression data in `evidence-known-cases.json`, still scoring 23/24. It is **not independently authored or unseen**, and its results were not used to tune the implementation. Its digest is checked by `evaluate:gamma4`; per-case checks are retained. This small targeted result must not be substituted for broad acceptance accuracy. A separate independent untouched final benchmark remains a release requirement. Source-ID checks and URL syntax do not constitute citation entailment measurement.

The stretch acceptance, conversation and complete-composition goals in `max` remain unmet. The unsupported false-acceptance goal is met on this published regression set (0/100), not established on an independent unseen distribution. Improved discovery is not improved answer correctness; most of the broad paraphrase/semantic gap remains.

## Remaining roadmap and limits

- A: broader robust NLU, typed conditional deduction, exclusion/applicability validation for every response path, meaningful calibration, French evaluation, multiple conversational reference frames and general option resolution remain incomplete. The new evidence contract gates expanded lexical acceptance, semantic acceptance and technical errors, not every legacy answer path. It is deterministic evidence coverage, not unrestricted logical entailment.
- B: general evidence planning, complete AI-technology synthesis, CSV/statistical/text-comparison tools, diagnostic risk/precondition/outcome metadata, richer knowledge relationships and new domain content are not delivered here. Existing 700 + 104 records are unchanged.
- C: section/chunk document indexes, multi-document comparisons, PDF/DOCX parsers, expanded research providers/freshness reconciliation, and additional persistent personalization are not delivered. Existing local text extraction, opted-in Wikimedia lookup and explicit memory remain available.
- D: no optional Gamma generation model was added, downloaded or silently substituted. Existing Madon/Qwen preview is separate. A suitable Gamma generation model still needs quality, license, memory, runtime and real device evaluation. GPU, physical mobile, Firefox/Safari and MV3 inference certification remain outstanding.
- Product: no redesign, new permissions, automatic model download, backend, accounts, analytics or private-data upload. New task metadata is response-local; existing analysis display shows operation outcomes. No new persisted schema needs migration.

## Reproduce

Use `ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci`, then the existing brand/type/knowledge/unit/build/payload/extension/browser checks. Final report destinations avoid overwriting baselines:

```sh
npm run evaluate:gamma -- docs/gamma4/evidence-lexical.json
npm run evaluate:gamma3 -- docs/gamma4/evidence-development.json
npm run evaluate:intelligence -- docs/gamma4/evidence-regression.json
npm run evaluate:gamma4
GAMMA_REPORT_DIR=docs/gamma4 npm run evaluate:semantic-heldout -- docs/gamma4/evidence-hybrid.json
# With a running production preview on port 4173:
GAMMA_REPORT_DIR=docs/gamma4 npm run test:gamma:real
GAMMA_REPORT_DIR=docs/gamma4 npm run measure:gamma
```

The new prospective baseline uses only the new evaluator/fixture copied into detached `1a30900`; no upgraded engine modules are copied. The old test that permitted high-cosine acceptance without support was strengthened to require clarification, and new regressions cover the changed boundary. No benchmark labels, lexical/semantic score thresholds or payload budgets were loosened. The added evidence route is evaluated independently of those scores. The prior test expecting an unsupported fallback for a repeated-logout phrase now verifies its correctly grounded lexical fallback; worker failure and cancellation remain tested.

## Verification and performance

- Dependency installation, branding audit, strict TypeScript and knowledge validation pass. Content remains 804 records / 3,019 expressions with all authored expressions ranking to their owner; `docs/coverage.json` is unchanged.
- **3,470 unit tests pass** (3,424 original plus 46 new). The new cases cover dependency completeness, per-part sources, contrast, affirmative corrections, obsolete-fact replay, diagnostic resumption, constrained natural tool execution, inert JSON, cancellation and network denial. Existing Markdown, migration, storage, worker and extension-boundary regressions remain in the suites.
- **74 production browser cases pass** in desktop/mobile Chromium viewports, including evidence-based acceptance and unsupported execution boundaries. The earlier foundation run corrected two persistence tests to reopen the saved thread after reload; the full follow-up suite passes. These are viewport emulations, not physical mobile certification.
- **16 extension checks pass** with Playwright Chromium 156, including production permission denial and the separate localhost-permission extraction fixture. The first attempt with system Chromium timed out waiting for the extension worker; retrying with the packaged supported browser passed. This is not actual toolbar-gesture certification.
- Website and MV3 builds pass. Startup JavaScript: **458,441 bytes raw / 142,683 gzip**, within the unchanged 650,000 / 210,000 limits. The final build’s background offline precache is 977,120 bytes, so lazy startup does not eliminate the larger offline transfer.
- Five final-build production browser samples measured median composer readiness **362.7 ms**, first answer visibility **201.2 ms**, and post-answer CDP heap **9,931,968 bytes**. Full samples are retained in `evidence-runtime/performance-after.json`. The earlier foundation samples ran alongside other verification, so these are not a controlled before/after speed comparison. The first follow-up attempt found that the preview server had stopped; it was restarted and the measurement rerun successfully. The performance script's `baseline` field refers to the older Gamma 2 payload, not this turn's base. No new peak model/process memory, battery, physical-device or warm-start distribution measurement is claimed.
- Actual pinned MiniLM WASM/CPU setup on the foundation build indexed 700 records in **34,613 ms**, reused cached assets offline, ran 38 development queries (median **10.6 ms**, P95 **61.1 ms**) and selectively removed its cache. This verifies the runtime, not broad semantic accuracy. The separate 356-case hybrid report replays previously measured model scores.
- Final default-engine regression latency: P50 **2.72 ms**, P95 **7.98 ms**, excluding presentation streaming and model inference.
- Production `/cole/` offline smoke passes; optional inference remains excluded from shell precache. Real GPU generation, cross-browser certification, large-pack stress, full document citation entailment and independent final holdout evaluation were not performed.

The targeted prospective test's one failure is its expected part-count marker on a correctly blocked public-lookup part: the response labels that part “Separate action required” instead of `Part N of N`. It has no unauthorized effect. Its fixture/result are retained unchanged rather than tuning the implementation to obtain 24/24.

## Development checklist

- [x] Audit current implementation and reproduce existing default baseline.
- [x] Integrated request/retrieval/evidence/tool/context improvements with unit and production browser coverage.
- [x] Preserve historical reports, frozen checksums, storage, commands, offline behavior and security boundaries.
- [x] Report actual improvements, unchanged metrics, semantic acceptance regression and limitations.
- [ ] Complete all of milestone A; meet the requested broad quality gates.
- [ ] Complete milestone B's general reasoning, tool and knowledge expansion.
- [ ] Implement milestone C's advanced document/research/personalization capabilities.
- [ ] Complete milestone D's optional Gamma generation evaluation and device hardening.
- [ ] Obtain independent untouched evaluation and editorial/source entailment review.
- [ ] Manual actual-toolbar activeTab gesture and physical hardware/browser validation.

Prepared as a review branch; no merge or production deployment is performed.
