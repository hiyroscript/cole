import { knowledge } from "../src/data/knowledge";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { respond } from "../src/core/gamma/engine";
import { rank } from "../src/core/gamma/retrieval";
import { emptyContext } from "../src/core/types";
const bytes = readFileSync("tests/heldout/gamma3.json", "utf8");
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== readFileSync("tests/heldout/SHA256", "utf8").trim())
  throw new Error(
    "Frozen fixture digest changed. Do not silently regenerate the held-out set.",
  );
type Case = {
  id: string;
  category: string;
  query?: string;
  turns?: string[];
  expected?: string | string[];
  browser?: string;
  platform?: string;
};
const fixture = JSON.parse(bytes) as { cases: Case[]; scope: string };
const results: Record<string, unknown>[] = [],
  latencies: number[] = [];
const counters = {
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
  conversations: 0,
  conversationSuccess: 0,
  compound: 0,
  compoundComplete: 0,
  safety: 0,
  safetyPassed: 0,
  citations: 0,
  validCitations: 0,
};
let requests = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  requests++;
  throw new Error("No network is authorized by this benchmark.");
};
try {
  for (const test of fixture.cases) {
    let context = emptyContext(),
      text = "",
      effect: unknown;
    const start = performance.now();
    for (const turn of test.turns ?? [test.query!]) {
      const response = await respond(turn, context, {
        thinking: "off",
        webSources: false,
        enhanced: false,
        facts: async () => [],
      });
      context = response.context;
      text = response.text;
      effect = response.effect;
    }
    const ms = performance.now() - start;
    latencies.push(ms);
    let passed = false;
    if (test.category === "supported") {
      counters.supported++;
      const candidates = rank(test.query!);
      const accepted = !!context.intent;
      if (context.intent === test.expected) {
        counters.correctAccepted++;
        passed = true;
      } else if (accepted) counters.incorrectAccepted++;
      else counters.incorrectAbstentions++;
      if (candidates[0]?.record.id === test.expected) counters.top1++;
      if (candidates.slice(0, 3).some((c) => c.record.id === test.expected))
        counters.recallAt3++;
      if (candidates.slice(0, 10).some((c) => c.record.id === test.expected))
        counters.recallAt10++;
    } else if (test.category === "unsupported") {
      counters.unsupported++;
      passed =
        (!context.intent ||
          /cannot|can.t|reliable answer to that|not exposed|unavailable|unsupported/i.test(
            text,
          )) &&
        !effect;
      if (passed) counters.correctAbstentions++;
      else counters.falseAccepted++;
    } else if (test.category === "conversation") {
      counters.conversations++;
      passed =
        context.browser === test.browser &&
        context.platform === test.platform &&
        context.intent === test.expected &&
        text.length > 60;
      if (passed) counters.conversationSuccess++;
    } else if (test.category === "compound") {
      counters.compound++;
      passed =
        (text.match(/Part \d of \d/g)?.length ?? 0) >= 2 &&
        !/reliable answer|clarification needed/i.test(text) &&
        (test.expected as string[]).every((id) => {
          const k = knowledge.find((r) => r.id === id);
          return (
            !!k &&
            (text.includes(k.title) || text.includes(k.answer.slice(0, 100)))
          );
        });
      if (passed) counters.compoundComplete++;
    } else {
      counters.safety++;
      passed = !effect && !context.intent && requests === 0;
      if (passed) counters.safetyPassed++;
    }
    for (const match of text.matchAll(/\]\((https?:[^)]+)\)/g)) {
      counters.citations++;
      try {
        const url = new URL(match[1]);
        if (url.protocol === "https:" && !url.username && !url.password)
          counters.validCitations++;
      } catch {}
    }
    results.push({
      id: test.id,
      category: test.category,
      passed,
      actual: context.intent,
      ms,
    });
  }
} finally {
  globalThis.fetch = originalFetch;
}
latencies.sort((a, b) => a - b);
const report = {
  date: new Date().toISOString(),
  fixtureSha256: digest,
  scope: fixture.scope,
  mode: "Lexical/default offline engine; optional packs are not installed, semantic inference is evaluated separately. Citation validity here is URL syntax, not source entailment.",
  counts: counters,
  supportedAcceptanceAccuracy: counters.correctAccepted / counters.supported,
  unsupportedFalseAcceptRate: counters.falseAccepted / counters.unsupported,
  conversationSuccessRate:
    counters.conversationSuccess / counters.conversations,
  compoundCompleteRate: counters.compoundComplete / counters.compound,
  recallAt3: counters.recallAt3 / counters.supported,
  recallAt10: counters.recallAt10 / counters.supported,
  p50Ms: latencies[Math.floor(latencies.length * 0.5)],
  p95Ms: latencies[Math.floor(latencies.length * 0.95)],
  unapprovedNetworkRequests: requests,
  results,
};
const output = process.argv[2] ?? "docs/gamma3/heldout.json";
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
