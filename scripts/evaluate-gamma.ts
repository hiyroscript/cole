import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { rank as original } from "../src/core/matcher";
import { rank } from "../src/core/gamma/retrieval";
import { respond } from "../src/core/gamma/engine";
import { emptyContext } from "../src/core/types";
import { retrievalCases } from "../tests/gamma-cases";
const reports = Object.entries({ original, lexical: rank }).map(
  ([name, retrieve]) => {
    let correct = 0,
      recall = 0,
      falsePositive = 0;
    const supported = retrievalCases.filter((c) => c.expected).length;
    const timings: number[] = [],
      misses: unknown[] = [];
    for (const c of retrievalCases) {
      const start = performance.now();
      const candidates = retrieve(c.query);
      timings.push(performance.now() - start);
      const first = candidates[0];
      const accepted =
        first &&
        (("evidenceAccepted" in first && first.evidenceAccepted === true) ||
          (first.score >= 0.63 &&
            !(
              candidates[1] &&
              first.score < 0.9 &&
              first.score - candidates[1].score < 0.055
            )));
      if (c.expected) {
        if (accepted && first.record.id === c.expected) correct++;
        if (candidates.slice(0, 3).some((r) => r.record.id === c.expected))
          recall++;
      } else if (accepted) falsePositive++;
      if (c.expected && (!accepted || first?.record.id !== c.expected))
        misses.push({
          query: c.query,
          expected: c.expected,
          actual: first?.record.id,
          score: first?.score,
          accepted: !!accepted,
        });
    }
    timings.sort((a, b) => a - b);
    return {
      name,
      cases: retrievalCases.length,
      supported,
      intentAccuracy: correct / supported,
      recallAt3: recall / supported,
      falsePositiveRate: falsePositive / (retrievalCases.length - supported),
      medianMs: timings[Math.floor(timings.length / 2)],
      p95Ms: timings[Math.floor(timings.length * 0.95)],
      misses,
    };
  },
);
const responseTimings: number[] = [];
for (const c of retrievalCases) {
  const start = performance.now();
  await respond(c.query, emptyContext(), {
    thinking: "auto",
    facts: async () => [],
  });
  responseTimings.push(performance.now() - start);
}
responseTimings.sort((a, b) => a - b);
const report = {
  fullResponse: {
    medianMs: responseTimings[Math.floor(responseTimings.length / 2)],
    p95Ms: responseTimings[Math.floor(responseTimings.length * 0.95)],
    scope:
      "Local engine routing, lexical retrieval, graph selection and composition; injected empty browser facts; excludes presentation streaming and optional model inference.",
  },
  note: "Algorithm comparison on the same expanded corpus; a small development set, not a representative production benchmark. Scores are ranking utilities, not probabilities. Hybrid relevance is not certified by this lexical evaluation.",
  reports,
};
writeFileSync(
  process.argv[2] ?? "docs/gamma-evaluation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
