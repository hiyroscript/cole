# Gamma 4.0 composition and result dependencies

This continuation starts from merged PR #9 (`13fa781`) on `feat/gamma4-composition`. It adds typed dependencies to the existing Core execution pipeline. No knowledge records, aliases, package dependencies, permissions, model weights or acceptance thresholds were added. The broad intelligence targets in `max` remain unmet.

## Working behavior

- “Explain CPU cache, then compare it with SSD storage” retains the full CPU-cache subject. It no longer substitutes the first technical entity, CPU.
- “Explain WebGPU and WebGL, then compare them” depends on both independently answered subjects. A missing subject or a singular reference to an ambiguous group asks for clarification.
- “Calculate 18% of 475, then multiply the result by 2” executes two actual calculations, producing 85.5 and 171. Further operations can consume the immediately preceding completed result. Subtraction preserves operand order.
- Unit conversion results retain units. “Calculate 2 hours to minutes, then convert the result to s” produces 120 minutes and 7200 s. Arithmetic on quantities and dimensionally incompatible conversions are rejected, rather than silently stripping units.
- Relative clauses and complementizers stay intact: “a login page that is phishing” and “tell that somebody is using Brave” do not refer to another task.
- Quotes, inline code and brackets cannot create dispatch boundaries. Once a data payload starts, its remaining text stays data. Unresolved conditional instructions remain unsplit; an explanatory question containing “when” can still be followed by a separate request.

The execution limit remains six tasks per request. Typed numeric results are ephemeral within that request, not saved variables or cross-turn memory. IEEE-754 arithmetic and the existing finite range, expression size, token and nesting limits remain in force. Values keep machine precision between steps; display rounds to twelve significant digits. This is not exact rational arithmetic or a general unit algebra system.

## Architecture and correctness

`task-reference.ts` identifies subject, group and numeric-result argument positions with exact text spans. It does not replace every occurrence of a pronoun. `task-boundaries.ts` marks top-level text in one pass. `request.ts` builds dependencies and retains the group identity of coordinated nominal explanations. `followup.ts` shares the depth/repeat grammar between planning and execution.

`task-input.ts` resolves only the planned predecessor(s), checks completion and output type, and rejects ambiguous or missing inputs. Subject resolution uses the supported record's complete title. A failed part cannot borrow an earlier successful result. Each task retains its own source IDs, subject referents, dependency IDs and optional numeric value. Evidence and referents are distinct: the authored Chrome/Firefox comparison is one source discussing two subjects, so “them” can resolve while singular “it” remains ambiguous.

`calculator.ts` returns a typed numeric value with an optional unit; its string-returning API remains compatible. `capabilities.ts` and `trusted-tools.ts` transport that value from actual execution to the dependent task. The `result` operand is bound inside the existing constrained arithmetic parser. Neither generated prose nor JSON fields claiming a completed operation can create a trusted result. Cancellation is checked before every task and tool execution.

`compare.ts` independently validates every comparison subject, including conditions and identifiers. The special browser/cache comparisons now require complete supported subject pairs. `comparison.ts` limits the AI-role projection to its authored scope: adding an AI keyword cannot establish an unrelated medical or other claim. Unsupported details retain no task sources and are not counted as answered. These remain bounded English grammars and authored comparisons, not general entailment or calibrated confidence.

## Evaluation

The 36-case composition fixture was frozen before implementation, then its baseline was inspected during development. It is implementer-authored development evaluation, **not independent or untouched holdout evaluation**. SHA-256: `f84856f3a160a4ab828f552e6c5a5c821c7f704c9228c93b9722ca8d45c29b28`.

| Composition contract category  | Previous | Current |
| ------------------------------ | -------: | ------: |
| Subject/group references       |      5/8 |     8/8 |
| Independent tasks              |      2/6 |     6/6 |
| Arithmetic dependencies        |     1/10 |   10/10 |
| Unsupported operations/details |      4/6 |     6/6 |
| Opaque payloads                |      6/6 |     6/6 |
| Total                          |    18/36 |   36/36 |

Checks require exact per-task statuses and source sets, requested result text and no unauthorized effects. They do not measure general factual correctness. [Baseline](gamma4/composition-contracts-baseline.json), [current](gamma4/composition-contracts.json), [fixture](../tests/evaluation/composition.json).

The published regression remains exposed data, with original labels and scoring unchanged. One expected HTTPS answer and its derived conversation now abstain: “What does HTTPS guarantee and what does it not guarantee?” was previously split into a successful first clause and an unanswered second clause. The legacy single-turn evaluator nevertheless counted the retained HTTPS intent as success. Keeping this shared-subject question intact exposes the still-missing answerability support for its full obligation. The decrease is retained, not hidden by reverting the constraint or changing the label. This illustrates why intent-ID correctness alone is not whole-answer completion.

| Published default regression    |  Previous stage | This continuation |
| ------------------------------- | --------------: | ----------------: |
| Correct supported acceptance    |  97/256 (37.9%) |    96/256 (37.5%) |
| Accepted label mismatches       |               6 |                 6 |
| Unsupported false acceptance    |           0/100 |             0/100 |
| Accepted label precision        |           94.2% |             94.1% |
| Recall@10                       | 220/256 (85.9%) |   220/256 (85.9%) |
| Correction/reference completion |          43/100 |            42/100 |
| Complete composed responses     |          12/100 |            14/100 |
| Adversarial no-effect checks    |           50/50 |             50/50 |

[Reproduced baseline](gamma4/composition-baseline.json), [current default](gamma4/composition-regression.json). The composition gains fix the false references in the independent Brave and phishing questions. These exposed examples helped diagnose the parser, so the gains are regression improvements, not evidence of unseen generalization.

The existing 40-case completion fixture remains 9/16 supported, 8/8 unsupported abstentions, 8/8 conversations and 8/8 compositions. The 32-case educational-frame fixture remains 16/16 supported, 7/8 raw unsupported, 4/4 conversations and 4/4 compositions. Its previously documented mixed DNS/password-file scoring limitation remains unchanged. The earlier capability suite remains 20/20, the 22-case conversation development suite 22/22, and the older 24-case fixture 23/24. No fixture labels were changed.

Real pinned MiniLM replay gives **102/256 (39.8%)** supported acceptance, six label mismatches, **0/100** unsupported false accepts and **233/256 (91.0%)** Recall@10, with zero missing queries. The preceding stage had 103/256 accepted expected answers; the HTTPS whole-question limitation accounts for the decrease. The new composition fixture also passes **36/36** under real-score replay, and the two earlier completion/frame fixtures retain their default category totals. All replay reports have complete query coverage. Replay is routing/acceptance evaluation, not an inference latency measurement. [Published hybrid](gamma4/composition-hybrid.json), [composition hybrid](gamma4/composition-contracts-hybrid.json).

## Verification and remaining scope

**3,665 unit tests across 17 files, 104 production browser cases and 27 extension checks pass**, together with a clean dependency install, TypeScript, branding, knowledge validation, both builds, formatting and unchanged payload budgets. The new contracts also run in the unit suite. Browser coverage includes desktop and emulated mobile Chromium, actual offline dependent calculations, comparisons and incomplete tasks. Extension checks use the shipping package; permission-grant testing retains the existing local-fixture distinction. [Verification record](gamma4/composition-runtime/verification.json).

Actual CPU/WASM MiniLM setup and indexing of 708 records took **29,582 ms**. The 46 collected engine queries measured median **14.1 ms**, P95 **54.5 ms**; offline cache reuse and selective removal passed. Supplemental real scores cover newly exposed engine subqueries without replacing the published labelled measurements. [Measurements](gamma4/composition-runtime/semantic-extra-measurements.json), [raw scores](gamma4/composition-runtime/semantic-extra-scores.json).

Startup JavaScript is **478,341 bytes raw / 149,198 gzip**, below the unchanged 650,000/210,000 limits. Shell precache is **1,036,479 bytes**, 5,960 bytes above the preceding stage. Five fresh-browser samples measured median composer readiness **360.9 ms**, visible answer **248 ms**, and post-answer JavaScript heap **10,125,876 bytes**. These container observations are not a controlled before/after performance comparison, physical-device certification or peak-memory measurement. [All samples](gamma4/composition-runtime/performance-after.json).

The published quality targets, independent factuality/entailment evaluation, general conditional reasoning and physical-device certification remain open. Numeric bindings are limited to the current request and immediate planned predecessor. General discourse/reference resolution remains limited. Broader document/research/Deep Mode limitations remain in [the delivery report](GAMMA4-DELIVERY.md). No merge or deployment is part of this continuation.

```sh
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci
npm run typecheck
npm test
npm run check:brand
npm run validate:knowledge
npm run evaluate:composition -- /tmp/composition.json
npm run evaluate:intelligence -- /tmp/regression.json
npm run build
npm run check:payload
npm run build:extension
npm run test:e2e
npm run test:extension
# With production preview running, explicitly downloads the pinned embedding model:
GAMMA_REPORT_DIR=docs/gamma4/composition-runtime GAMMA_EXTRA_QUERIES=docs/gamma4/composition-runtime/queries.json npm run test:gamma:real
GAMMA_COMPLETION_SCORES=docs/gamma4/composition-runtime/semantic-extra-scores.json npm run evaluate:composition -- /tmp/composition-hybrid.json
GAMMA_REPORT_DIR=docs/gamma4/composition-runtime GAMMA_SCORES=docs/gamma4/final-runtime/heldout-semantic-scores.json GAMMA_EXTRA_SCORES=docs/gamma4/final-runtime/semantic-extra-scores.json GAMMA_ADDITIONAL_SCORES=docs/gamma4/composition-runtime/semantic-extra-scores.json npm run evaluate:semantic-heldout -- /tmp/published-hybrid.json
GAMMA_REPORT_DIR=docs/gamma4/composition-runtime npm run measure:gamma
```

Do not rebuild `dist` during active browser/model tests. The baseline runner also accepts `GAMMA_ENGINE_ROOT` pointing at an earlier checkout. Real-score replay reports missing queries explicitly; it does not measure inference latency.
