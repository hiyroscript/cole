import { test, expect } from "@playwright/test";

test("GitHub Pages loads Cole and its assets at /cole/", async ({ page }) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("requestfailed", (request) => failures.push(request.url()));
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });

  // Keep the deployed repository path explicit so a stale preview base cannot
  // make the suite pass while the real GitHub Pages URL stays blank.
  await page.goto("/cole/");
  await expect(
    page.getByRole("heading", { name: "Where should we begin?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Message Gamma" }),
  ).toBeEnabled();

  const assetPaths = await page
    .locator(
      'script[src], link[rel="stylesheet"], link[rel="manifest"], link[rel="icon"]',
    )
    .evaluateAll((elements) =>
      elements.map(
        (element) =>
          new URL(
            element.getAttribute("src") || element.getAttribute("href")!,
            location.href,
          ).pathname,
      ),
    );
  expect(assetPaths.length).toBeGreaterThanOrEqual(4);
  for (const path of assetPaths) expect(path).toMatch(/^\/cole\//);

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration?.active
          ? new URL(registration.scope).pathname
          : null;
      }),
    )
    .toBe("/cole/");
  expect(failures).toEqual([]);
});
