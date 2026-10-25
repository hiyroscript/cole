import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const url = process.env.VAREK_PREVIEW_URL || "http://127.0.0.1:4173/cole/";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url);
  await page
    .getByRole("textbox", { name: "Message Gamma", exact: true })
    .waitFor();
  const sw = await (await page.request.get(new URL("sw.js", url).href)).text();
  const precache = JSON.parse(sw.match(/const ASSETS=(\[[\s\S]*?\])\.map/)[1]);
  assert(
    !precache.some((f) =>
      /semantic-worker|ort-|\.wasm$|transport-|^assets\/worker-/.test(f),
    ),
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("textbox", { name: "Message Gamma", exact: true })
    .fill("/calculate 7 * 8");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page
    .getByRole("button", { name: "Copy response", exact: true })
    .waitFor();
  assert((await page.locator("main").innerText()).includes("56"));
  console.log(
    JSON.stringify({
      url,
      offlineCalculation: true,
      optionalInferenceExcludedFromPrecache: true,
    }),
  );
} finally {
  await browser.close();
}
