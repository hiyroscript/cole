import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
if (!process.argv.includes("--network"))
  throw Error("Pass --network to authorize a live public MDN lookup.");
const directory =
  process.env.GAMMA_REPORT_DIR ?? "docs/gamma4/completion-runtime";
await mkdir(directory, { recursive: true });
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
  const page = await browser.newPage(),
    requests = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1"))
      requests.push({ method: r.method(), url: r.url() });
  });
  await page.goto(
    process.env.VAREK_PREVIEW_URL || "http://127.0.0.1:4173/cole/",
  );
  const ask = async (text) => {
    await page
      .getByRole("textbox", { name: "Message Gamma", exact: true })
      .fill(text);
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Stop response", exact: true })
      .waitFor({ state: "detached" });
  };
  await ask("/research mdn webgpu");
  if (requests.length)
    throw Error("Research accessed the network without opt-in.");
  await ask("/web on");
  await ask("/research mdn webgpu");
  const text = await page.locator("article").last().innerText();
  const success =
    text.includes("Newly retrieved MDN") && text.includes("File revision date");
  await writeFile(
    `${directory}/mdn-browser.json`,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        scope:
          "Actual production Chromium UI and cross-origin provider requests; no mocked fetch.",
        success,
        requests,
        text,
      },
      null,
      2,
    ) + "\n",
  );
  if (!success) throw Error("Live research did not return dated MDN evidence.");
  console.log(
    "Real browser MDN lookup passed:",
    requests.length,
    "public requests.",
  );
} finally {
  await browser.close();
}
