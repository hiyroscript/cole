import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const manifest = JSON.parse(await readFile("dist/.vite/manifest.json", "utf8"));
const initial = new Set();
function collect(key) {
  const item = manifest[key];
  if (!item || initial.has(item.file)) return;
  initial.add(item.file);
  for (const imported of item.imports ?? []) collect(imported);
}
collect("index.html");
const assets = await Promise.all(
  [...initial].map((file) => readFile("dist/" + file)),
);
const javascriptBytes = assets.reduce((sum, bytes) => sum + bytes.length, 0);
const gzipBytes = assets.reduce(
  (sum, bytes) => sum + gzipSync(bytes).length,
  0,
);
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
const sw = await readFile("dist/sw.js", "utf8");
const precache = JSON.parse(sw.match(/const ASSETS=(\[[\s\S]*?\])\.map/)[1]);
let precacheBytes = 0;
for (const file of precache)
  precacheBytes += (await readFile("dist/" + file)).length;
const report = {
  environment:
    "Headless Chromium, Linux container, local production preview, fresh browser context for each of five samples, reduced motion; no network throttling or physical mobile measurement",
  baseline: { javascriptBytes: 815496, gzipBytes: 262048 },
  current: { javascriptBytes, gzipBytes, initialAssets: [...initial] },
  changePercent: (javascriptBytes / 815496 - 1) * 100,
  backgroundPrecacheBytes: precacheBytes,
  budgets,
  budgetExceeded:
    javascriptBytes > budgets.initialJavascriptBytes ||
    gzipBytes > budgets.initialGzipBytes,
  median: {
    readyMs: median("readyMs"),
    responseVisibleMs: median("responseVisibleMs"),
    jsHeapUsedBytes: median("jsHeapUsedBytes"),
  },
  samples,
  note: "Initial payload includes the entry and all static manifest imports, excluding dynamic engine/domain/inference chunks. Core offline assets still precache in the background. CDP JS heap is a post-answer snapshot, not peak process or inference memory. Container measurements do not certify physical-device performance.",
};
await writeFile(
  "docs/gamma3/performance-after.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report);
