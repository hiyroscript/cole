import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { Response, Context } from "../src/core/types";
const root = process.env.GAMMA_ENGINE_ROOT ?? process.cwd();
const { respond } = await import(
  pathToFileURL(resolve(root, "src/core/gamma/engine.ts")).href
);
const { emptyContext } = await import(
  pathToFileURL(resolve(root, "src/core/types.ts")).href
);
const { rank } = await import(
  pathToFileURL(resolve(root, "src/core/gamma/retrieval.ts")).href
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
  semantic.query = async (input: string) => {
    if (!byQuery.has(input)) semanticMissing.add(input);
    return byQuery.get(input) ?? [];
  };
}
const fixturePath =
  process.env.GAMMA_EVALUATION_FIXTURE ?? "tests/evaluation/completion.json";
const bytes = readFileSync(fixturePath, "utf8"),
  digest = createHash("sha256").update(bytes).digest("hex");
if (
  digest !==
  readFileSync(fixturePath.replace(/\.json$/, ".sha256"), "utf8").trim()
)
  throw Error("Frozen fixture changed");
type Result = {
  id: string;
  category: string;
  passed: boolean;
  actual: string | null;
  recallAt10: boolean;
  ms: number;
  turns: {
    text: string;
    intent: string | null;
    effect: unknown;
    sources: string[];
  }[];
  tasks: NonNullable<Response["tasks"]>;
};
const fixture = JSON.parse(bytes),
  results: Result[] = [];
let network = 0;
const original = globalThis.fetch;
globalThis.fetch = async () => {
  network++;
  throw Error("Network not authorized");
};
try {
  for (const test of fixture.cases) {
    let context: Context = emptyContext(),
      response: Response = { text: "", context };
    const start = performance.now();
    const turns = [];
    for (const turn of test.turns) {
      response = await respond(turn, context, {
        thinking: "off",
        webSources: false,
        enhanced: !!process.env.GAMMA_COMPLETION_SCORES,
        facts: async () => [],
      });
      context = response.context;
      turns.push({
        text: response.text,
        intent: context.intent ?? null,
        effect: response.effect ?? null,
        sources: context.authoredSources ?? [],
      });
    }
    let passed = false,
      recall = false;
    if (test.category === "supported") {
      passed = context.intent === test.expected;
      recall = rank(test.turns[0])
        .slice(0, 10)
        .some((c: { record: { id: string } }) => c.record.id === test.expected);
    } else if (test.category === "unsupported")
      passed = !context.intent && !turns.some((t) => t.effect);
    else if (test.category === "conversation")
      passed =
        context.intent === test.expected &&
        context.browser === test.browser &&
        context.platform === test.platform &&
        response.text.length > 60;
    else if (test.category === "compound")
      passed =
        test.expected.every((id: string) =>
          response.tasks?.some(
            (task: { status: string; sources: string[] }) =>
              task.status === "answered" && task.sources.includes(id),
          ),
        ) &&
        response.tasks?.every(
          (task: { status: string }) => task.status === "answered",
        );
    results.push({
      id: test.id,
      category: test.category,
      passed: !!passed,
      actual: context.intent ?? null,
      recallAt10: recall,
      ms: performance.now() - start,
      turns,
      tasks: response.tasks ?? [],
    });
  }
} finally {
  globalThis.fetch = original;
  semantic.query = savedQuery;
}
const categories = Object.fromEntries(
  ["supported", "unsupported", "conversation", "compound"].map((category) => {
    const rows = results.filter((r) => r.category === category);
    return [
      category,
      { passed: rows.filter((r) => r.passed).length, total: rows.length },
    ];
  }),
);
const report = {
  mode: process.env.GAMMA_COMPLETION_SCORES
    ? "Real MiniLM score replay; latency excludes inference."
    : "Default local engine",
  semanticMissing: [...semanticMissing],
  scope: fixture.scope,
  fixtureSha256: digest,
  date: new Date().toISOString(),
  categories,
  recallAt10:
    results.filter((r) => r.category === "supported" && r.recallAt10).length /
    Math.max(1, results.filter((r) => r.category === "supported").length),
  unapprovedNetworkRequests: network,
  results,
};
writeFileSync(
  process.argv[2] ?? "docs/gamma4/completion-unseen.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
