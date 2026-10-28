import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { Response } from "../src/core/types";

const root = process.env.GAMMA_ENGINE_ROOT ?? process.cwd();
const { respond } = await import(
  pathToFileURL(resolve(root, "src/core/gamma/engine.ts")).href
);
const { emptyContext } = await import(
  pathToFileURL(resolve(root, "src/core/types.ts")).href
);
const { semantic } = await import(
  pathToFileURL(resolve(root, "src/core/gamma/semantic.ts")).href
);
const semanticMissing = new Set<string>();
const savedQuery = semantic.query;
if (process.env.GAMMA_COMPLETION_SCORES) {
  const entries = JSON.parse(
    readFileSync(process.env.GAMMA_COMPLETION_SCORES, "utf8"),
  ) as { query: string; scores: { id: string; score: number }[] }[];
  const byQuery = new Map(entries.map((e) => [e.query, e.scores]));
  semantic.query = async (query: string) => {
    if (!byQuery.has(query)) semanticMissing.add(query);
    return byQuery.get(query) ?? [];
  };
}
const bytes = readFileSync("tests/evaluation/composition.json", "utf8");
const digest = createHash("sha256").update(bytes).digest("hex");
if (
  digest !== readFileSync("tests/evaluation/composition.sha256", "utf8").trim()
)
  throw Error("Frozen composition fixture changed");
const fixture = JSON.parse(bytes) as {
  scope: string;
  cases: {
    id: string;
    category: string;
    query: string;
    contains?: string[];
    excludes?: string[];
    tasks?: { status: string; sources: string[] }[];
    operation?: string;
  }[];
};
const original = globalThis.fetch;
let network = 0;
const results: {
  id: string;
  category: string;
  passed: boolean;
  checks: Record<string, boolean>;
  ms: number;
  text: string;
  tasks: NonNullable<Response["tasks"]>;
  operation: Response["operation"] | null;
}[] = [];
globalThis.fetch = async () => {
  network++;
  throw Error("Network is not authorized in this composition evaluation");
};
try {
  for (const test of fixture.cases) {
    const start = performance.now();
    const result: Response = await respond(test.query, emptyContext(), {
      thinking: "off",
      facts: async () => [],
      webSources: false,
      enhanced: !!process.env.GAMMA_COMPLETION_SCORES,
    });
    const checks = {
      text: (test.contains ?? []).every((text) => result.text.includes(text)),
      excludes: (test.excludes ?? []).every(
        (text) => !result.text.includes(text),
      ),
      operation:
        !test.operation ||
        (result.operation?.name === test.operation &&
          result.operation.status === "completed" &&
          !result.tasks),
      tasks:
        !test.tasks ||
        (result.tasks?.length === test.tasks.length &&
          test.tasks.every(
            (task, i) =>
              result.tasks?.[i].status === task.status &&
              JSON.stringify(result.tasks[i].sources.toSorted()) ===
                JSON.stringify(task.sources.toSorted()),
          )),
      safety: !result.effect && network === 0,
    };
    results.push({
      id: test.id,
      category: test.category,
      passed: Object.values(checks).every(Boolean),
      checks,
      ms: performance.now() - start,
      text: result.text,
      tasks: result.tasks ?? [],
      operation: result.operation ?? null,
    });
  }
} finally {
  globalThis.fetch = original;
  semantic.query = savedQuery;
}
const report = {
  mode: process.env.GAMMA_COMPLETION_SCORES
    ? "Real MiniLM score replay; latency excludes inference."
    : "Default local engine",
  semanticMissing: [...semanticMissing],
  scope: fixture.scope,
  fixtureSha256: digest,
  date: new Date().toISOString(),
  passed: results.filter((r) => r.passed).length,
  total: results.length,
  unapprovedNetworkRequests: network,
  categories: Object.fromEntries(
    [...new Set(results.map((r) => r.category))].map((category) => {
      const rows = results.filter((r) => r.category === category);
      return [
        category,
        { passed: rows.filter((r) => r.passed).length, total: rows.length },
      ];
    }),
  ),
  results,
};
writeFileSync(
  process.argv[2] ?? "docs/gamma4/composition-contracts.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
