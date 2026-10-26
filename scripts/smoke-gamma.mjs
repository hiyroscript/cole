import { chromium } from "@playwright/test";
import { readdir, writeFile, readFile } from "node:fs/promises";
import { knowledge } from "../src/data/knowledge.ts";
import { retrievalCases } from "../tests/gamma-cases.ts";
import { rerank } from "../src/core/gamma/rerank.ts";
import { confidence, rank } from "../src/core/gamma/retrieval.ts";
const heldout = process.env.GAMMA_HELDOUT === "1";
const extra = process.env.GAMMA_EXTRA_QUERIES;
const cases = extra
  ? JSON.parse(await readFile(extra, "utf8")).map((query) => ({
      query,
      expected: null,
      kind: "engine-subquery",
    }))
  : heldout
    ? JSON.parse(await readFile("tests/heldout/gamma3.json", "utf8"))
        .cases.filter((c) => ["supported", "unsupported"].includes(c.category))
        .map((c) => ({
          query: c.query,
          expected: c.expected ?? null,
          kind: c.category,
        }))
    : retrievalCases;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
  ...(process.env.HTTPS_PROXY
    ? {
        proxy: {
          server: process.env.HTTPS_PROXY,
          bypass: "127.0.0.1,localhost",
        },
      }
    : {}),
});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(
    process.env.VAREK_PREVIEW_URL || "http://127.0.0.1:4173/cole/",
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("summary").filter({ hasText: "Assistant setup" }).click();
  page.on("dialog", (d) => d.accept());
  const start = Date.now();
  await page
    .getByRole("button", {
      name: "Enable and download enhancement",
      exact: true,
    })
    .click();
  await page
    .getByText("Local semantic matching is ready (experimental).", {
      exact: true,
    })
    .waitFor({ timeout: 240000 });
  const setupMs = Date.now() - start;
  console.log("Real WASM setup and indexing passed", setupMs, "ms");
  await page.reload();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("summary").filter({ hasText: "Assistant setup" }).click();
  await page
    .getByRole("button", {
      name: "Initialize enhanced understanding",
      exact: true,
    })
    .click();
  await page
    .getByText("Local semantic matching is ready (experimental).", {
      exact: true,
    })
    .waitFor({ timeout: 60000 });
  console.log("Offline cache reuse passed");
  const file = (await readdir("dist/assets")).find(
    (f) => f.startsWith("semantic-worker-") && f.endsWith(".js"),
  );
  const scores = await page.evaluate(
    async ({ file, records, queries }) => {
      const worker = new Worker(`/cole/assets/${file}`, { type: "module" });
      try {
        await new Promise((resolve, reject) => {
          worker.onmessage = ({ data }) => {
            if (data.type === "ready") resolve();
            if (data.type === "error") reject(new Error(data.detail));
          };
          worker.onerror = reject;
          worker.postMessage({ type: "init", records });
        });
        const results = [];
        for (let id = 0; id < queries.length; id++) {
          const started = performance.now();
          const result = await new Promise((resolve, reject) => {
            worker.onmessage = ({ data }) => {
              if (data.type === "result" && data.id === id)
                resolve(data.scores);
              if (data.type === "error") reject(new Error(data.detail));
            };
            worker.postMessage({ type: "query", id, text: queries[id] });
          });
          results.push({ scores: result, ms: performance.now() - started });
        }
        return results;
      } finally {
        worker.terminate();
      }
    },
    {
      file,
      records: knowledge.map((k) => ({
        id: k.id,
        text: [k.title, ...k.phrases].join(". "),
      })),
      queries: cases.map((c) => c.query),
    },
  );
  await writeFile(
    extra
      ? `${process.env.GAMMA_REPORT_DIR ?? "docs/gamma3"}/semantic-extra-scores.json`
      : heldout
        ? `${process.env.GAMMA_REPORT_DIR ?? "docs/gamma3"}/heldout-semantic-scores.json`
        : `${process.env.GAMMA_REPORT_DIR ?? "docs/gamma3"}/semantic-scores.json`,
    JSON.stringify(
      cases.map((c, i) => ({ ...c, ...scores[i] })),
      null,
      2,
    ) + "\n",
  );
  const supported = cases.filter((c) => c.expected).length;
  let top1 = 0,
    recall = 0;
  for (let i = 0; i < scores.length; i++) {
    const expected = cases[i].expected;
    if (expected) {
      if (scores[i].scores[0]?.id === expected) top1++;
      if (scores[i].scores.slice(0, 3).some((s) => s.id === expected)) recall++;
    }
  }
  const hybridResults = cases.map((c, i) => {
    const candidates = rerank(c.query, rank(c.query), scores[i].scores);
    const accepted = ["high", "moderate"].includes(confidence(candidates));
    return {
      query: c.query,
      expected: c.expected,
      actual: candidates[0]?.record.id,
      accepted,
      recalled: candidates
        .slice(0, 3)
        .some((candidate) => candidate.record.id === c.expected),
    };
  });
  const hybrid = extra
    ? null
    : {
        intentAccuracy:
          hybridResults.filter(
            (r) => r.expected && r.accepted && r.actual === r.expected,
          ).length / supported,
        recallAt3:
          hybridResults.filter((r) => r.expected && r.recalled).length /
          supported,
        falsePositiveRate:
          hybridResults.filter((r) => !r.expected && r.accepted).length /
          (cases.length - supported),
        misses: hybridResults.filter((r) =>
          r.expected ? !r.accepted || r.actual !== r.expected : r.accepted,
        ),
      };
  const latencies = scores.map((s) => s.ms).sort((a, b) => a - b);
  const report = {
    environment:
      "Headless Chromium, Linux container, single-thread WASM CPU; not physical mobile hardware",
    model: "Xenova/all-MiniLM-L6-v2",
    revision: "751bff37182d3f1213fa05d7196b954e230abad9",
    setupMs,
    offlineCacheReuse: true,
    records: knowledge.length,
    queries: scores.length,
    hybrid,
    semanticOnlyTop1: supported ? top1 / supported : null,
    semanticOnlyRecallAt3: supported ? recall / supported : null,
    queryMedianMs: latencies[Math.floor(latencies.length / 2)],
    queryP95Ms: latencies[Math.floor(latencies.length * 0.95)],
    note: extra
      ? "Unlabelled engine subqueries collected for full-response replay. No relevance or acceptance rate is computed for this supplemental set."
      : "Raw semantic neighbors are not acceptance decisions. Hybrid reranking remains conservative and experimental; this small development set does not certify general relevance.",
  };
  await writeFile(
    extra
      ? `${process.env.GAMMA_REPORT_DIR ?? "docs/gamma3"}/semantic-extra-measurements.json`
      : heldout
        ? `${process.env.GAMMA_REPORT_DIR ?? "docs/gamma3"}/heldout-semantic-measurements.json`
        : `${process.env.GAMMA_REPORT_DIR ?? "docs/gamma3"}/semantic-after.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(report);
  await page
    .getByRole("button", { name: "Remove enhancement data", exact: true })
    .click();
  if (await page.evaluate(() => caches.has("gamma-semantic-v1")))
    throw new Error("Semantic cache remains after removal");
  console.log("Selective cache removal passed");
} finally {
  await browser.close();
}
