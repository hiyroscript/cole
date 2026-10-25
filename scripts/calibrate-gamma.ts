import { readFileSync, writeFileSync } from "node:fs";
import { rank, confidence } from "../src/core/gamma/retrieval";
import { rerank, semanticPolicy } from "../src/core/gamma/rerank";
const data = JSON.parse(
  readFileSync("docs/gamma3/semantic-scores.json", "utf8"),
) as {
  query: string;
  expected: string | null;
  scores: { id: string; score: number }[];
}[];
const results = [];
for (const floor of [0.65, 0.7, 0.75])
  for (const margin of [0.08, 0.1, 0.15])
    for (const lexicalWeight of [0.25, 0.5, 0.75]) {
      let correct = 0,
        wrong = 0,
        falseAccepts = 0,
        recalled = 0;
      for (const row of data) {
        const candidates = rerank(row.query, rank(row.query), row.scores, {
          floor,
          margin,
          lexicalWeight,
        });
        const accepted = ["high", "moderate"].includes(confidence(candidates));
        if (
          row.expected &&
          candidates.slice(0, 3).some((c) => c.record.id === row.expected)
        )
          recalled++;
        if (accepted) {
          if (!row.expected) falseAccepts++;
          else if (candidates[0].record.id === row.expected) correct++;
          else wrong++;
        }
      }
      results.push({
        floor,
        margin,
        lexicalWeight,
        correct,
        wrong,
        falseAccepts,
        recalled,
      });
    }
const report = {
  scope:
    "38 development queries, 26 supported and 12 unsupported. Raw scores from pinned MiniLM WASM. Frozen held-out cases are not used to select these gates. Small sample; not a calibrated probability or general safety guarantee.",
  selected: semanticPolicy,
  selection:
    "Prefer the conservative middle floor/margin among zero-false-accept configurations; equal rank weights avoid fitting weights to a small set. Exact, dangerous, excluded, error and applicability checks remain independent gates.",
  results,
};
writeFileSync(
  "docs/gamma3/calibration.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    results.filter((r) => r.lexicalWeight === 0.5),
    null,
    2,
  ),
);
