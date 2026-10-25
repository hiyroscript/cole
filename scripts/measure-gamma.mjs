import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const html = await readFile("dist/index.html", "utf8");
const entry = html.match(/src="[^"]*\/assets\/([^"/]+\.js)"/)?.[1];
if (!entry) throw new Error("Built entry script was not found");
const bytes = await readFile(`dist/assets/${entry}`);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const samples = [];
try {
  for (let i = 0; i < 5; i++) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    await page.goto(
      process.env.VAREK_PREVIEW_URL || "http://127.0.0.1:4173/cole/",
    );
    await page
      .getByRole("textbox", { name: "Message Gamma", exact: true })
      .waitFor();
    const readyMs = await page.evaluate(() => performance.now());
    await page
      .getByRole("textbox", { name: "Message Gamma", exact: true })
      .fill("What is WebAssembly?");
    const start = await page.evaluate(() => performance.now());
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Copy response", exact: true })
      .waitFor();
    const responseVisibleMs =
      (await page.evaluate(() => performance.now())) - start;
    const metrics = (await cdp.send("Performance.getMetrics")).metrics;
    samples.push({
      readyMs,
      responseVisibleMs,
      jsHeapUsedBytes: metrics.find((m) => m.name === "JSHeapUsedSize")?.value,
    });
    await context.close();
  }
} finally {
  await browser.close();
}
const median = (key) =>
  [...samples].sort((a, b) => a[key] - b[key])[Math.floor(samples.length / 2)][
    key
  ];
const budgets = { initialJavascriptBytes: 650000, initialGzipBytes: 210000 };
const report = {
  environment:
    "Headless Chromium, Linux container, local production preview, fresh browser context for each of five samples, reduced motion; no network throttling or physical mobile measurement",
  baseline: { javascriptBytes: 499750, gzipBytes: 160640 },
  current: { javascriptBytes: bytes.length, gzipBytes: gzipSync(bytes).length },
  changePercent: (bytes.length / 499750 - 1) * 100,
  budgets,
  budgetExceeded:
    bytes.length > budgets.initialJavascriptBytes ||
    gzipSync(bytes).length > budgets.initialGzipBytes,
  median: {
    readyMs: median("readyMs"),
    responseVisibleMs: median("responseVisibleMs"),
    jsHeapUsedBytes: median("jsHeapUsedBytes"),
  },
  samples,
  note: "The initial 650 kB / 210 kB gzip budget is exceeded after expansion from 205 to 700 records and 75 workflows. This is a documented payload regression. Optional inference runtimes and weights remain excluded from initial requests. Browser timing has no measured pre-upgrade counterpart; do not infer a startup speedup. CDP JS heap is not total process or peak inference memory.",
};
await writeFile(
  "docs/gamma-performance.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report);
