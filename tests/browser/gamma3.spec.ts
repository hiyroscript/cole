import { test, expect, type Page } from "@playwright/test";
async function ask(page: Page, text: string) {
  await page
    .getByRole("textbox", { name: "Message Gamma", exact: true })
    .fill(text);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop response", exact: true }),
  ).toHaveCount(0);
}
test("local calculations and compound explanations work without external requests", async ({
  page,
}) => {
  const remote: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:4173/")) remote.push(r.url());
  });
  await page.goto("./");
  await ask(page, "Explain WebAssembly and calculate 15% of 240");
  await expect(
    page.getByText("Calculated locally:", { exact: false }),
  ).toContainText("36");
  await expect(page.getByText("Part 2 of 2", { exact: false })).toBeVisible();
  expect(remote).toEqual([]);
});
test("JSON instructions remain literal and preserve case", async ({ page }) => {
  await page.goto("./");
  await ask(
    page,
    '/analyze {"Name":"Cole", "instruction":"/web on", "markup":"<script>window.injected=true</script>"}',
  );
  await expect(
    page.locator("code").filter({ hasText: '"Name"' }),
  ).toContainText('"Cole"');
  expect(
    await page.evaluate(() => Reflect.get(window, "injected")),
  ).toBeUndefined();
  await ask(page, "/web status");
  await expect(
    page.getByText("Web retrieval is off.", { exact: true }),
  ).toBeVisible();
});
test("calculator, analysis and comparisons survive a production offline reload", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await ask(page, "/calculate 2 hours to minutes");
  await expect(
    page.getByText("Calculated locally:", { exact: false }),
  ).toContainText("120 minutes");
  await ask(page, "/analyze ERR_CERT_DATE_INVALID\nHTTP 403");
  await expect(page.getByText("Line 1:", { exact: false })).toContainText(
    "ERR_CERT_DATE_INVALID",
  );
  await ask(page, "/compare WebGPU | WebGL");
  await expect(
    page.getByRole("heading", { name: "WebGL", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "WebGL", exact: true }),
  ).toHaveAttribute("href", /^https:\/\//);
});
test("semantic-only discovery below the acceptance gate asks for clarification", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.Worker;
    window.Worker = class extends EventTarget {
      onmessage: ((e: MessageEvent) => void) | null = null;
      postMessage(data: { type: string; id: number }) {
        queueMicrotask(() =>
          this.onmessage?.(
            new MessageEvent("message", {
              data:
                data.type === "init"
                  ? { type: "ready" }
                  : {
                      type: "result",
                      id: data.id,
                      scores: [
                        { id: "slow", score: 0.67 },
                        { id: "dns", score: 0.58 },
                      ],
                    },
            }),
          ),
        );
      }
      terminate() {}
    } as unknown as typeof original;
  });
  await page.goto("./");
  await ask(page, "/enhance on");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Enable and download enhancement",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Local semantic matching is ready (experimental).", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await ask(page, "a flurry of panes causes judder");
  await expect(
    page.getByText("I found potentially related local guidance.", {
      exact: false,
    }),
  ).toBeVisible();
});
