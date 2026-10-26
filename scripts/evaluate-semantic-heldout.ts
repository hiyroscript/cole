import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { respond } from "../src/core/gamma/engine";
import { emptyContext } from "../src/core/types";
import { semantic } from "../src/core/gamma/semantic";
import { rank, confidence } from "../src/core/gamma/retrieval";
import { rerank } from "../src/core/gamma/rerank";
const bytes = readFileSync("tests/heldout/gamma3.json", "utf8");
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== readFileSync("tests/heldout/SHA256", "utf8").trim())
  throw new Error("Held-out fixture changed.");
const cases = JSON.parse(bytes).cases.filter((c: { category: string }) =>
  ["supported", "unsupported"].includes(c.category),
) as { id: string; category: string; query: string; expected?: string }[];
const scores = JSON.parse(
  readFileSync(
    process.env.GAMMA_SCORES ?? "docs/gamma3/heldout-semantic-scores.json",
    "utf8",
  ),
) as {
  query: string;
  expected: string | null;
  scores: { id: string; score: number }[];
}[];
const extraPath =
  process.env.GAMMA_EXTRA_SCORES ?? "docs/gamma3/semantic-extra-scores.json";
if (existsSync(extraPath))
  scores.push(...JSON.parse(readFileSync(extraPath, "utf8")));
const byQuery = new Map(scores.map((c) => [c.query, c]));
if (
  cases.some(
    (c) =>
      !byQuery.has(c.query) ||
      (byQuery.get(c.query)!.expected ?? null) !== (c.expected ?? null),
  )
)
  throw new Error(
    "Real-model scores must cover this exact held-out single-turn fixture.",
  );
const originalQuery = semantic.query,
  originalFetch = globalThis.fetch;
const missingQueries = new Set<string>();
let network = 0,
  fallbackQueries = 0;
semantic.query = async (input) => {
  const match = byQuery.get(input);
  if (!match) {
    fallbackQueries++;
    missingQueries.add(input);
  }
  return match?.scores ?? [];
};
globalThis.fetch = async () => {
  network++;
  throw new Error("No networking authorized in response replay.");
};
const counts = {
  supported: 0,
  correctAccepted: 0,
  incorrectAccepted: 0,
  incorrectAbstentions: 0,
  unsupported: 0,
  correctAbstentions: 0,
  falseAccepted: 0,
  recallAt3: 0,
  recallAt10: 0,
  top1: 0,
};
const results = [];
try {
  for (const c of cases) {
    const response = await respond(c.query, emptyContext(), {
      enhanced: true,
      thinking: "off",
      webSources: false,
      facts: async () => [],
    });
    const candidates = rerank(
      c.query,
      rank(c.query),
      byQuery.get(c.query)!.scores,
    );
    let passed = false;
    if (c.category === "supported") {
      counts.supported++;
      if (response.context.intent === c.expected) {
        counts.correctAccepted++;
        passed = true;
      } else if (response.context.intent) counts.incorrectAccepted++;
      else counts.incorrectAbstentions++;
      if (candidates[0]?.record.id === c.expected) counts.top1++;
      if (candidates.slice(0, 3).some((k) => k.record.id === c.expected))
        counts.recallAt3++;
      if (candidates.slice(0, 10).some((k) => k.record.id === c.expected))
        counts.recallAt10++;
    } else {
      counts.unsupported++;
      passed =
        (!response.context.intent ||
          /cannot|can.t|reliable answer to that|not exposed|unavailable|unsupported/i.test(
            response.text,
          )) &&
        !response.effect;
      if (passed) counts.correctAbstentions++;
      else counts.falseAccepted++;
    }
    results.push({
      id: c.id,
      passed,
      actual: response.context.intent,
      retrievalAccepted: ["high", "moderate"].includes(confidence(candidates)),
    });
  }
} finally {
  semantic.query = originalQuery;
  globalThis.fetch = originalFetch;
}
if (missingQueries.size)
  writeFileSync(
    `${process.env.GAMMA_REPORT_DIR ?? "docs/gamma3"}/heldout-semantic-missing.json`,
    JSON.stringify([...missingQueries], null, 2) + "\n",
  );
const report = {
  fixtureSha256: digest,
  scope:
    "356 frozen single-turn cases; real pinned MiniLM/WASM scores replayed into the full response engine. Full response routing and limitations are included. Multi-turn and compound cases remain in the separate default-mode report. This replay does not measure inference latency.",
  counts,
  acceptedAnswerPrecisionOnSingleTurns:
    counts.correctAccepted /
    Math.max(
      1,
      counts.correctAccepted + counts.incorrectAccepted + counts.falseAccepted,
    ),
  supportedAcceptanceAccuracy: counts.correctAccepted / counts.supported,
  unsupportedFalseAcceptRate: counts.falseAccepted / counts.unsupported,
  recallAt3: counts.recallAt3 / counts.supported,
  recallAt10: counts.recallAt10 / counts.supported,
  unapprovedNetworkRequests: network,
  scoreFallbackQueries: fallbackQueries,
  results,
};
writeFileSync(
  process.argv[2] ?? "docs/gamma3/heldout-hybrid.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
