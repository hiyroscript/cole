import { test, expect, type Page } from "@playwright/test";
async function openSidebar(page: Page) {
  const toggle = page.getByRole("button", {
    name: "Open sidebar",
    exact: true,
  });
  if (await toggle.isVisible()) await toggle.click();
}
test("Cole loads an existing Varek database and preferences without rewriting content", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("textbox", { name: "Message Gamma" }),
  ).toBeEnabled();
  const fixture = {
    id: "before-cole",
    title: "Varek notes to keep",
    pinned: true,
    updated: 1700000000000,
    context: {
      depth: "standard",
      updated: 1700000000000,
      turns: 1,
      attempted: ["slow"],
    },
    messages: [
      {
        id: "user-before",
        role: "user",
        text: "Varek, keep my notes exactly as written.",
      },
      {
        id: "assistant-before",
        role: "assistant",
        model: "gamma",
        text: "Existing Varek answer.",
        evidence: [
          {
            label: "Memory",
            value: "8 GB",
            kind: "Estimated",
            group: "Device",
          },
        ],
      },
    ],
  };
  await page.evaluate(async (fixture) => {
    localStorage.setItem(
      "varek.preferences.v1",
      JSON.stringify({
        name: "Sam",
        device: "Original laptop notes",
        model: "gamma",
        theme: "dark",
        thinking: "on",
        webSources: false,
        enhanced: false,
      }),
    );
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("varek", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("conversations", "readwrite");
        tx.objectStore("conversations").put(fixture);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, fixture);
  await page.reload();
  await expect(page).toHaveTitle("Cole — Local Intelligence");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("heading", { name: "Sam, where should we begin?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Thinking mode" }),
  ).toHaveValue("on");
  await openSidebar(page);
  await expect(
    page.getByRole("button", {
      name: "Unpin Varek notes to keep",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Varek notes to keep", exact: true })
    .click();
  await expect(page.locator(".messages")).toContainText(
    "Varek, keep my notes exactly as written.",
  );
  await expect(page.locator(".messages")).toContainText(
    "Existing Varek answer.",
  );
  await expect(page.locator(".messages")).toContainText("8 GB");
  await openSidebar(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Device notes" })).toHaveValue(
    "Original laptop notes",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  const stored = await page.evaluate(
    async () =>
      new Promise((resolve) => {
        const request = indexedDB.open("varek", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("conversations");
          const row = tx.objectStore("conversations").get("before-cole");
          tx.oncomplete = () => {
            resolve(row.result);
            db.close();
          };
        };
      }),
  );
  expect(stored).toEqual(fixture);
});

test("Cole installation metadata and icon assets resolve under the existing subpath", async ({
  page,
  request,
}) => {
  await page.goto("./");
  await expect(page).toHaveTitle("Cole — Local Intelligence");
  const manifest = await (await request.get("manifest.webmanifest")).json();
  expect(manifest.name).toBe("Cole");
  expect(manifest.scope).toBe("./");
  expect(manifest.theme_color).toBe("#F7F7F7");
  expect(
    manifest.icons.some(
      (icon: { purpose: string }) => icon.purpose === "maskable",
    ),
  ).toBe(true);
  for (const file of [
    ...manifest.icons.map((icon: { src: string }) => icon.src),
    "logo.svg",
    "favicon.png",
    "apple-touch-icon.png",
  ]) {
    expect((await request.get(file)).ok()).toBe(true);
  }
  expect(
    await page
      .locator(".welcome-logo")
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBe(true);
});

test("settings appearance, advanced disclosure and model controls remain keyboard reachable", async ({
  page,
}) => {
  await page.goto("./");
  await openSidebar(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const theme = page.getByRole("combobox", { name: "Appearance" });
  await theme.selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await theme.selectOption("system");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await theme.selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const disclosure = page.locator(".settings-disclosure > summary");
  await disclosure.focus();
  await disclosure.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Gamma · Enhanced understanding" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Set up Madon" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("resizing into the mobile drawer keeps background inert and restores composer access", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("./");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.locator("main")).not.toHaveAttribute("inert", "");
  await expect(
    page.getByRole("textbox", { name: "Message Gamma" }),
  ).toBeEnabled();
});
