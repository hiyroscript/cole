# Core understanding and evidence retrieval

This continuation starts from merged PR #8 (`1b302b0`) on `feat/gamma4-understanding`. It improves the existing deterministic Core engine. No records, question aliases, dependencies, model weights, permissions or acceptance thresholds were added. Broad intelligence goals in `max` remain unmet.

## Changes

`question.ts` parses bounded, whole educational constructions into definition, purpose or description frames with an explicit subject and optional output style. The same frame informs task planning and query rewriting. For example, “What is the purpose of WebSockets?” retrieves the WebSockets subject; “Could you give me a brief explanation of ETags?” changes the subject instead of replaying the previous answer. Unknown modifiers, conditional clauses and domain restrictions remain in the subject. Only recognized presentation requests such as “in everyday language” are removed. This is an English grammar, not general semantic understanding.

`retrieval.ts` adds a cached inverted index over canonical title/answer terms. Punctuation, short plurals and acronym plurals now match consistently. Up to twelve evidence candidates supplement the existing alias ranking; their rank utility is not increased to simulate confidence. A unique, low-risk candidate still needs the independent coherent-passage/subject check before this path accepts it. More retrieved records therefore do not automatically become more answers.

HTTP identifiers normalize across “HTTP 415”, “HTTP status 415”, “status 415”, “status code 415” and “error code 415”, retaining the exact number. Missing identifiers, conflicting applicability and missing central technical subjects block acceptance even when a legacy lexical score is high. A blocked candidate cannot prevent another independently supported candidate from being selected. Explicit presupposed guarantees with missing evidence also abstain. Asking whether a guarantee exists is distinguished from assuming a guaranteed outcome. Unreconciled “without” conditions block lexical and semantically boosted acceptance while exact authored diagnostic labels remain usable; recognized presentation-only “without jargon” requests are handled separately. These checks are bounded rules, not entailment; other legacy acceptance decisions still use heuristic ranking.

Punctuated follow-ups retain their topic. “Brief explanation of X” is separated from “Make that shorter.” Clarification answers such as “the second one” resolve only against the current offered topic list, with bounds and platform checks. Missing/out-of-range choices request a named topic. Topic selection cannot execute an operation.

## Measured results

The published fixture is exposed regression data. Labels and thresholds are unchanged.

| Published default regression    |  Previous stage | This continuation |
| ------------------------------- | --------------: | ----------------: |
| Correct supported acceptance    |  93/256 (36.3%) |    97/256 (37.9%) |
| Accepted label mismatches       |               7 |                 6 |
| Unsupported false acceptance    |           0/100 |             0/100 |
| Accepted label precision        |           93.0% |             94.2% |
| Recall@10                       | 181/256 (70.7%) |   220/256 (85.9%) |
| Correction/reference completion |          42/100 |            43/100 |
| Complete composed responses     |          12/100 |            12/100 |
| Adversarial no-effect checks    |           50/50 |             50/50 |

The principal gain is discovery, not broad answer completion. Real pinned MiniLM scores replayed through the updated engine give 103/256 (40.2%) correct supported acceptance, six label mismatches, 0/100 unsupported false accepts and 233/256 (91.0%) Recall@10. All required score queries were present. Replay measures routing/acceptance, not inference latency. See [default](gamma4/understanding-regression.json) and [hybrid](gamma4/understanding-hybrid.json).

The previous 40-case completion fixture now gives 9/16 supported answers, 8/8 unsupported abstentions, 8/8 conversations and 8/8 composed responses, versus 8/16, 8/8, 7/8 and 8/8 at the previous stage. Lexical Recall@10 is 87.5%. Its [default report](gamma4/understanding-completion.json) and [real-score replay](gamma4/understanding-completion-hybrid.json) have the same category totals and no missing score queries. These cases are already exposed regression data.

A 32-case question-frame fixture was frozen before implementation and evaluated against the previous engine. Its baseline was examined during development, so it is **development evaluation, not an unseen or independent holdout**. Supported answers improve from 10/16 to 16/16, conversations from 2/4 to 4/4, and composition from 3/4 to 4/4. Raw unsupported results improve from 6/8 to 7/8. The remaining case mixes a supported DNS question with a denied password-file access request; the fixture's whole-turn “no intent” criterion incorrectly rejects partial completion. Its label/report are preserved, and a separate unit/browser check verifies `answered` then `needs-information`, no sources for the denied operation, and no effect. Do not report this as eight wholly unsupported requests. [Baseline](gamma4/understanding-baseline.json), [current](gamma4/understanding-frames.json), [frozen fixture](../tests/evaluation/understanding.json).

Record-ID correctness is not factuality. For example, the newly accepted `network-port` answer explicitly establishes the requested scheme/hostname/port relationship, but the regression expects `origin`; it remains a label mismatch in the raw report. No label was changed to improve a score. General ambiguity, paraphrase comprehension and compound completion remain weak. The older capability fixture stays 20/20, and the older 24-case evaluation stays 23/24.

## Verification and reproduction

**3,588 unit tests, 96 production browser cases, 24 extension checks and 20 capability checks pass**, along with TypeScript, branding, knowledge validation, both builds and the unchanged payload budgets. Browser cases exercise topic changes, punctuated follow-ups, offline composition, unknown status codes and denied access after an answered task. Extension checks exercise the shipping bundle. See the [verification record](gamma4/understanding-runtime/verification.json).

Real Chromium CPU/WASM MiniLM inference indexed 708 records in 26,582 ms and measured 42 new fixture/subqueries (median 12.8 ms, P95 52 ms). Offline reuse and selective cache removal passed. [Real-score replay](gamma4/understanding-frames-hybrid.json) has the same category totals as the default frame report and no missing score queries; its Recall@10 field still measures lexical retrieval. [Raw model measurements](gamma4/understanding-runtime/semantic-extra-measurements.json). The [first real-score replay](gamma4/understanding-frames-hybrid-first-use.json) had 6/8 raw unsupported passes: in addition to the mixed-task scoring limitation, it accepted related adapter guidance for “WebGPU without an adapter or a GPU.” That failure led to the explicit condition guard. The first report is preserved separately from the corrected replay; neither is an unseen holdout.

Startup JavaScript is **478,341 bytes raw / 149,199 gzip**, within the unchanged 650,000/210,000 limits. Shell precache is 1,030,519 bytes, 3,231 bytes above the previous stage. Five fresh-browser samples measured median composer readiness 336.3 ms, visible answer 252.1 ms and post-answer JavaScript heap 10,045,248 bytes. These are container observations, not a controlled before/after speed test or a peak-memory measurement. [All samples](gamma4/understanding-runtime/performance-after.json).

Historical reports and checksums remain intact. No merge or deployment is part of this continuation.

```sh
npm run typecheck
npm test
npm run check:brand
npm run validate:knowledge
npm run build
npm run check:payload
npm run build:extension
npm run test:e2e
npm run test:extension
npm run evaluate:intelligence -- /tmp/default.json
GAMMA_EVALUATION_FIXTURE=tests/evaluation/understanding.json npx tsx scripts/evaluate-completion.ts /tmp/frames.json
GAMMA_SCORES=docs/gamma4/final-runtime/heldout-semantic-scores.json GAMMA_EXTRA_SCORES=docs/gamma4/final-runtime/semantic-extra-scores.json npm run evaluate:semantic-heldout -- /tmp/hybrid.json
# Production preview must already be running; explicitly downloads the pinned embedding model:
GAMMA_REPORT_DIR=docs/gamma4/understanding-runtime GAMMA_EXTRA_QUERIES=docs/gamma4/understanding-runtime/queries.json npm run test:gamma:real
GAMMA_EVALUATION_FIXTURE=tests/evaluation/understanding.json GAMMA_COMPLETION_SCORES=docs/gamma4/understanding-runtime/semantic-extra-scores.json npx tsx scripts/evaluate-completion.ts /tmp/frames-hybrid.json
```

Use production preview for browser measurements. Do not rebuild `dist` during browser or model tests. `GAMMA_EVALUATION_FIXTURE` selects a fixture with its own mandatory `.sha256` file; the original completion fixture remains the default. The evaluator's Recall@10 denominator now follows the selected supported-case count instead of assuming sixteen.
