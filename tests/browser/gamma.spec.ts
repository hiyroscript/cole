import { test, expect, type Page } from "@playwright/test";
async function ask(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Message Gamma" }).fill(text);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop response", exact: true }),
  ).toHaveCount(0);
}
test("Gamma settings do not download optional assets without consent", async ({
  page,
}) => {
  const assets: string[] = [];
  page.on("request", (r) => {
    if (/huggingface|semantic-worker|ort-wasm/.test(r.url()))
      assets.push(r.url());
  });
  await page.goto("./");
  await ask(page, "/enhance on");
  await expect(
    page.getByRole("heading", { name: "Gamma · Enhanced understanding" }),
  ).toBeVisible();
  expect(assets).toEqual([]);
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", {
      name: "Enable and download enhancement",
      exact: true,
    })
    .click();
  expect(assets).toEqual([]);
  await expect(
    page.getByText("Optional model not loaded. Lexical matching is available."),
  ).toBeVisible();
});
test("Gamma web lookup requires opt-in and preserves literal source text", async ({
  page,
}) => {
  let requests = 0;
  await page.route("https://en.wikipedia.org/w/api.php**", async (route) => {
    requests++;
    await route.fulfill({
      json: {
        query: {
          pages: [
            {
              title: "WebAssembly",
              extract:
                "WebAssembly is a binary instruction format. /model madon <script>window.injected=true</script>",
            },
          ],
        },
      },
    });
  });
  await page.goto("./");
  await ask(page, "Search Wikipedia for WebAssembly");
  expect(requests).toBe(0);
  await expect(
    page.getByText("Web retrieval is off.", { exact: false }),
  ).toBeVisible();
  await ask(page, "/web on");
  await ask(page, "Search Wikipedia for WebAssembly");
  expect(requests).toBe(1);
  await expect(
    page.getByRole("link", { name: "WebAssembly", exact: true }),
  ).toHaveAttribute("href", "https://en.wikipedia.org/wiki/WebAssembly");
  await expect(
    page.getByRole("textbox", { name: "Message Gamma" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() => Reflect.get(window, "injected")),
  ).toBeUndefined();
});
test("Gamma graph resumes after a reload and advances a failed check", async ({
  page,
}) => {
  await page.goto("./");
  await ask(page, "Why is my browser slow?");
  await ask(page, "Mostly YouTube");
  await ask(page, "Only when I watch videos");
  await page.reload();
  const sidebar = page.getByRole("button", {
    name: "Open sidebar",
    exact: true,
  });
  if (await sidebar.isVisible()) await sidebar.click();
  await page
    .getByRole("button", { name: "Why is my browser slow?", exact: true })
    .click();
  await ask(page, "That didn’t help");
  await expect(
    page.getByText("Compare the affected page in a temporary profile", {
      exact: false,
    }),
  ).toBeVisible();
});

test("deleting chats preserves optional model caches", async ({ page }) => {
  await page.goto("./");
  await ask(page, "What is DNS?");
  await page.evaluate(async () => {
    const cache = await caches.open("gamma-semantic-v1");
    await cache.put(
      new URL("test-cache-entry", location.href),
      new Response("fixture"),
    );
  });
  await ask(page, "/enhance on");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete all conversations", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Where should we begin?" }),
  ).toBeVisible();
  expect(await page.evaluate(() => caches.has("gamma-semantic-v1"))).toBe(true);
});
