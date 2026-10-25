import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(
    page.getByRole("textbox", { name: "Message Gamma" }),
  ).toBeEnabled();
});
async function ask(page: import("@playwright/test").Page, text: string) {
  await page.getByRole("textbox", { name: "Message Gamma" }).fill(text);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop response", exact: true }),
  ).toHaveCount(0);
}
async function sidebar(page: import("@playwright/test").Page) {
  const open = page.getByRole("button", { name: "Open sidebar", exact: true });
  if (await open.isVisible()) await open.click();
}
test("brand, diagnostics, follow-up, persistence and deletion", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Where should we begin?" }),
  ).toBeVisible();
  await ask(page, "What browser am I using?");
  await expect(page.getByText("This browser identifies as")).toBeVisible();
  await expect(
    page.getByText("Browser family", { exact: false }),
  ).toBeVisible();
  await ask(page, "Is it secure?");
  await expect(
    page.getByText("An updated browser", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await sidebar(page);
  await page
    .getByRole("button", { name: "What browser am I using?", exact: true })
    .click();
  await expect(
    page.getByText("An updated browser", { exact: false }),
  ).toBeVisible();
  await sidebar(page);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Delete What browser am I using?",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Where should we begin?" }),
  ).toBeVisible();
});
test("slash keyboard navigation and dark theme", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "Message Gamma" });
  await input.fill("/the");
  await expect(page.getByRole("listbox")).toBeVisible();
  await input.press("Enter");
  await expect(input).toHaveValue("/theme ");
  await input.fill("/theme dark");
  await input.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: `test-results/theme-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("Madon selection requires explicit setup and persists without downloading", async ({
  page,
}) => {
  const downloads: string[] = [];
  page.on("request", (request) => {
    if (/huggingface|raw.githubusercontent/.test(request.url()))
      downloads.push(request.url());
  });
  await page.getByRole("button", { name: "Gamma", exact: true }).click();
  await page.getByRole("button", { name: /Madon/ }).click();
  await expect(
    page.getByRole("heading", { name: "Set up Madon" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download and initialize" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Message Madon" }),
  ).toBeEnabled();
  expect(downloads).toEqual([]);
  await page.getByRole("button", { name: "Madon", exact: true }).click();
  await page
    .getByRole("button", { name: "Switch to Gamma", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Message Gamma" }),
  ).toBeVisible();
});
test("safe untrusted input and no horizontal overflow", async ({ page }) => {
  await ask(page, "<img src=x onerror=alert(1)> write a poem");
  await expect(
    page.getByText("I don’t have a reliable answer", { exact: false }),
  ).toBeVisible();
  expect(await page.locator(".prose img").count()).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("offline after initial caching", async ({ page, context }) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Where should we begin?" }),
  ).toBeVisible();
  await ask(page, "What is DNS?");
  await expect(
    page.getByText("DNS translates domain names", { exact: false }),
  ).toBeVisible();
  await context.setOffline(false);
});
test("history search, rename, pin, and export", async ({ page }) => {
  await ask(page, "What is HTTPS?");
  await sidebar(page);
  page.once("dialog", (d) => d.accept("Connection notes"));
  await page
    .getByRole("button", { name: "Rename What is HTTPS?", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pin Connection notes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unpin Connection notes", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search conversations" })
    .fill("Connection");
  await expect(
    page.getByRole("button", { name: "Connection notes", exact: true }),
  ).toBeVisible();
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
  const downloaded = page.waitForEvent("download");
  await ask(page, "/export");
  expect((await downloaded).suggestedFilename()).toBe(
    "cole-conversation.json",
  );
});
test("welcome screenshot and keyboard accessibility", async ({ page }) => {
  await page.screenshot({
    path: `test-results/welcome-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to composer" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("textbox", { name: "Message Gamma" }),
  ).toBeFocused();
});
test("stop keeps a partial answer", async ({ page }) => {
  await page.getByRole("textbox", { name: "Message Gamma" }).fill("/help");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page
    .getByRole("button", { name: "Stop response", exact: true })
    .click();
  await expect(page.getByText("Stopped", { exact: true })).toBeVisible();
});
