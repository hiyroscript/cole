import { workflows, validateGraphs } from "../src/core/gamma/workflows";
import { conversations } from "../tests/gamma-cases";
import { rank as gammaRank } from "../src/core/gamma/retrieval";
import { knowledge } from "../src/data/knowledge";
import { indexSize, normalize } from "../src/core/matcher";
import { writeFileSync } from "node:fs";
const errors: string[] = [...validateGraphs()];
const ids = new Set<string>(),
  answers = new Set<string>(),
  phrases = new Set<string>();
for (const k of knowledge) {
  if (ids.has(k.id)) errors.push("Duplicate id: " + k.id);
  ids.add(k.id);
  if (answers.has(k.answer)) errors.push("Duplicate answer: " + k.id);
  answers.add(k.answer);
  try {
    const url = new URL(k.reference);
    if (url.protocol !== "https:" || url.username || url.password)
      errors.push("Unsafe reference: " + k.id);
  } catch {
    errors.push("Invalid reference: " + k.id);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k.reviewed))
    errors.push("Missing review date: " + k.id);
  if (k.related.some((id) => !knowledge.some((other) => other.id === id)))
    errors.push("Broken related reference: " + k.id);
  if (
    k.platforms?.some(
      (p) => !["Windows", "macOS", "Linux", "Android", "iOS"].includes(p),
    )
  )
    errors.push("Unknown platform: " + k.id);
  if (k.risk && k.risk !== "low" && !k.safety)
    errors.push("Missing safety note: " + k.id);
  if (
    !k.title ||
    !k.answer ||
    !k.phrases.length ||
    !k.reference ||
    !k.steps.length
  )
    errors.push("Missing fields: " + k.id);
  for (const p of k.phrases) {
    const n = normalize(p);
    if (phrases.has(n)) errors.push("Duplicate expression: " + p);
    phrases.add(n);
    const hit = gammaRank(p)[0];
    if (hit?.record.id !== k.id)
      errors.push(`Misranked: ${p} => ${hit?.record.id}, expected ${k.id}`);
  }
}
const report = {
  records: knowledge.length,
  uniqueExpressions: phrases.size,
  indexTokens: indexSize(),
  categories: [...new Set(knowledge.map((k) => k.category))],
  troubleshootingFlows: workflows.length,
  branchPaths: workflows.reduce((sum, f) => {
    const count = (id: string, seen: Set<string>): number => {
      if (seen.has(id)) {
        errors.push("Cycle: " + f.id);
        return 0;
      }
      const node = f.nodes.find((n) => n.id === id)!;
      return node.branches.length
        ? node.branches.reduce(
            (s, b) => s + count(b.next, new Set([...seen, id])),
            0,
          )
        : 1;
    };
    return sum + count(f.start, new Set());
  }, 0),
  authoredMultiTurnScenarios: conversations.length,
  sourceUrlsValidated: true,
  sourceAvailabilityChecked: false, // See the separately dated reference audit.
  errors,
  targets: {
    records: 700,
    expressions: 2500,
    workflows: 75,
    branchPaths: 250,
    multiTurnScenarios: 300,
  },
};
const minimums = {
  records: 700,
  uniqueExpressions: 2500,
  troubleshootingFlows: 75,
  branchPaths: 250,
  authoredMultiTurnScenarios: 300,
};
for (const [key, minimum] of Object.entries(minimums))
  if (report[key as keyof typeof minimums] < minimum)
    errors.push(`${key}: below required ${minimum}`);
const names = new Set<string>();
const exchanges = new Set<string>();
for (const scenario of conversations) {
  if (names.has(scenario.name) || exchanges.has(scenario.turns.join("\n")))
    errors.push("Duplicate scenario: " + scenario.name);
  if (scenario.turns.length < 2 || !scenario.contains)
    errors.push("Invalid conversation: " + scenario.name);
  names.add(scenario.name);
  exchanges.add(scenario.turns.join("\n"));
}
writeFileSync("docs/coverage.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
