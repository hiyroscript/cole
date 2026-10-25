import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { respond } from "../src/core/gamma/engine";
import { emptyContext } from "../src/core/types";
import { gamma3Cases } from "../tests/gamma3-cases";
const results = [];
for (const test of gamma3Cases) {
  const start = performance.now();
  const result = await respond(test.query, emptyContext(), {
    thinking: "off",
    facts: async () => [],
  });
  results.push({
    ...test,
    passed: test.contains.every((s) => result.text.includes(s)),
    ms: performance.now() - start,
    response: result.text,
  });
}
const times = results.map((r) => r.ms).sort((a, b) => a - b);
const report = {
  scope:
    "22 development response checks; not held out, not a general intelligence accuracy estimate. Empty browser facts; semantics disabled.",
  passed: results.filter((r) => r.passed).length,
  total: results.length,
  p50Ms: times[Math.floor(times.length / 2)],
  p95Ms: times[Math.floor(times.length * 0.95)],
  results,
};
const output = process.argv[2] || "docs/gamma3/development.json";
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    output,
    passed: report.passed,
    total: report.total,
    p95Ms: report.p95Ms,
  }),
);

if (!process.argv[2] && report.passed !== report.total) process.exitCode = 1;
