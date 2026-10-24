// Opt-in real hardware check. Start the production preview before running.
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
  headless: process.env.HEADED !== "1",
  args: ["--no-sandbox"],
});
const context = await browser.newContext();
const page = await context.newPage();
const report = {
  browser: browser.version(),
  model: "Qwen3-1.7B-q4f16_1-MLC",
  runtime: "0.2.86",
  generated: false,
};
try {
  await page.goto(process.env.VAREK_URL || "http://127.0.0.1:4173/varek/");
  report.capabilities = await page.evaluate(async () => {
    const adapter = await navigator.gpu?.requestAdapter();
    return {
      webgpu: !!navigator.gpu,
      adapter: !!adapter,
      shaderF16: adapter?.features.has("shader-f16") ?? false,
    };
  });
  if (!report.capabilities.adapter || !report.capabilities.shaderF16) {
    report.blocked =
      "No compatible WebGPU adapter; real model download/inference not tested.";
    process.exitCode = 2;
  } else if (!process.argv.includes("--download")) {
    report.blocked =
      "Run with --download to authorize roughly 1 GB of model assets and real inference.";
    process.exitCode = 2;
  } else {
    await page.getByRole("button", { name: "Gamma", exact: true }).click();
    await page.getByRole("button", { name: /Madon/ }).click();
    const start = Date.now();
    await page.getByRole("button", { name: "Download and initialize" }).click();
    await page
      .getByText("Madon is initialized and ready.", { exact: false })
      .waitFor({ timeout: 900000 });
    report.initializationMs = Date.now() - start;
    await page.getByRole("button", { name: "Close dialog" }).click();
    const ask = async (prompt, mode) => {
      await page
        .getByRole("combobox", { name: "Thinking mode" })
        .selectOption(mode);
      await page.getByRole("textbox", { name: "Message Madon" }).fill(prompt);
      await page
        .getByRole("button", { name: "Send message", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Stop response" })
        .waitFor({ state: "hidden", timeout: 180000 });
      const text = await page.locator(".assistant .prose").last().innerText();
      if (
        text.length < 8 ||
        /could not be completed/.test(text) ||
        (await page.locator(".generation-error").count())
      )
        throw new Error("Generation failed");
      return text;
    };
    report.answer = await ask(
      "In one sentence, explain the difference between RAM and storage.",
      "off",
    );
    report.followup = await ask(
      "Which one keeps data when power is off?",
      "on",
    );
    await page
      .getByRole("textbox", { name: "Message Madon" })
      .fill("Write a long explanation of memory in computers.");
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await page.getByRole("button", { name: "Stop response" }).click();
    await page
      .getByRole("button", { name: "Stop response" })
      .waitFor({ state: "hidden" });
    report.afterStop = await ask("Say hello.", "off");
    await page.reload();
    await context.setOffline(true);
    await page.getByRole("button", { name: "Madon", exact: true }).click();
    await page.getByRole("button", { name: "Download and initialize" }).click();
    await page
      .getByText("Madon is initialized and ready.", { exact: false })
      .waitFor({ timeout: 180000 });
    await page.getByRole("button", { name: "Close dialog" }).click();
    report.cachedOffline = await ask("Say hello again.", "off");
    report.generated = true;
  }
} catch (error) {
  report.error = String(error);
  process.exitCode = 1;
} finally {
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
