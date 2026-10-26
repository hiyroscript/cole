import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { respond } from "../src/core/gamma/engine";
import { importDocument } from "../src/core/gamma/documents";
import { emptyContext } from "../src/core/types";
const bytes = readFileSync("tests/evaluation/capabilities.json", "utf8");
const fixture = JSON.parse(bytes) as {
  scope: string;
  cases: {
    id: string;
    query: string;
    operation?: string;
    status?: string;
    contains: string[];
    sources?: string[];
    parts?: number;
    documents?: { name: string; text: string }[];
  }[];
};
const original = globalThis.fetch;
let network = 0;
const results = [];
globalThis.fetch = async () => {
  network++;
  throw Error("Network is not authorized in this capability benchmark");
};
try {
  for (const test of fixture.cases) {
    const result = await respond(test.query, emptyContext(), {
      thinking: "off",
      facts: async () => [],
      webSources: false,
      documents: test.documents?.map((d) => importDocument(d.name, d.text)),
    });
    const checks = {
      text: test.contains.every((text) => result.text.includes(text)),
      operation:
        !test.operation ||
        (result.operation?.name === test.operation &&
          result.operation.status === "completed"),
      status: !test.status || result.operation?.status === test.status,
      sources:
        !test.sources ||
        test.sources.every((id) =>
          result.context.authoredSources?.includes(id),
        ),
      parts:
        !test.parts ||
        (result.tasks?.length === test.parts &&
          result.tasks.every((t) => t.status === "answered")),
      safety: !result.effect && network === 0,
    };
    results.push({
      id: test.id,
      passed: Object.values(checks).every(Boolean),
      checks,
    });
  }
} finally {
  globalThis.fetch = original;
}
const report = {
  scope: fixture.scope,
  fixtureSha256: createHash("sha256").update(bytes).digest("hex"),
  total: results.length,
  passed: results.filter((r) => r.passed).length,
  unauthorizedNetworkRequests: network,
  results,
};
writeFileSync(
  process.argv[2] ?? "docs/gamma4/final-capabilities.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
