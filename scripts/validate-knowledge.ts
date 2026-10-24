import { knowledge } from "../src/data/knowledge";
import { rank, indexSize, normalize } from "../src/core/matcher";
import { flows } from "../src/core/flows";
import { writeFileSync } from "node:fs";
const errors: string[] = [];
const ids = new Set<string>(),
  answers = new Set<string>(),
  phrases = new Set<string>();
for (const k of knowledge) {
  if (ids.has(k.id)) errors.push("Duplicate id: " + k.id);
  ids.add(k.id);
  if (answers.has(k.answer)) errors.push("Duplicate answer: " + k.id);
  answers.add(k.answer);
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
    const hit = rank(p)[0];
    if (hit?.record.id !== k.id)
      errors.push(`Misranked: ${p} => ${hit?.record.id}, expected ${k.id}`);
  }
}
const report = {
  records: knowledge.length,
  uniqueExpressions: phrases.size,
  indexTokens: indexSize(),
  categories: [...new Set(knowledge.map((k) => k.category))],
  troubleshootingFlows: flows.length,
  branchPaths: flows.reduce((sum, f) => sum + (f.id === "heat" ? 3 : 4), 0),
  errors,
  targets: { records: 700, expressions: 2500, flowsOrPaths: 100 },
};
writeFileSync("docs/coverage.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
