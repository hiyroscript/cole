import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { respond } from "../src/core/gamma/engine";
import { emptyContext } from "../src/core/types";
const bytes = readFileSync("tests/evaluation/gamma4.json", "utf8");
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== readFileSync("tests/evaluation/gamma4.sha256", "utf8").trim())
  throw Error("Evaluation fixture changed");
type Case = {
  id: number;
  category: string;
  turns: string[];
  contains: string[];
  absent: string[];
  sources: string[];
  browser?: string;
  platform?: string;
  parts?: number;
};
const fixture = JSON.parse(bytes) as { scope: string; cases: Case[] };
const results = [];
let network = 0;
const original = globalThis.fetch;
globalThis.fetch = async () => {
  network++;
  throw Error("Unauthorized network request");
};
try {
  for (const test of fixture.cases) {
    let context = emptyContext(),
      text = "",
      effects = 0;
    const start = performance.now();
    for (const turn of test.turns) {
      const r = await respond(turn, context, {
        thinking: "off",
        facts: async () => [],
        webSources: false,
      });
      context = r.context;
      text = r.text;
      effects += Number(!!r.effect);
    }
    const checks = {
      requiredText: test.contains.every((t) =>
        text.toLowerCase().includes(t.toLowerCase()),
      ),
      excludedText: test.absent.every((t) => !text.includes(t)),
      sources: test.sources.every((id) =>
        context.authoredSources?.includes(id),
      ),
      browser: !test.browser || context.browser === test.browser,
      platform: !test.platform || context.platform === test.platform,
      parts:
        !test.parts ||
        (text.match(/Part \d of \d/g)?.length ?? 0) === test.parts,
      safety: effects === 0 && network === 0,
    };
    results.push({
      id: test.id,
      category: test.category,
      passed: Object.values(checks).every(Boolean),
      checks,
      ms: performance.now() - start,
    });
  }
} finally {
  globalThis.fetch = original;
}
const times = results.map((r) => r.ms).sort((a, b) => a - b);
const report = {
  scope: fixture.scope,
  fixtureSha256: digest,
  passed: results.filter((r) => r.passed).length,
  total: results.length,
  unapprovedNetworkRequests: network,
  p50Ms: times[Math.floor(times.length * 0.5)],
  p95Ms: times[Math.floor(times.length * 0.95)],
  results,
};
writeFileSync(
  process.argv[2] ?? "docs/gamma4/prospective.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
