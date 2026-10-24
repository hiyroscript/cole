import { test, expect, type Page } from "@playwright/test";
// Test-only Worker replacement speaks the official WebLLM protocol. No mock hooks ship in the app.
async function mockRuntime(page: Page, fail = false, slowSetup = false) {
  await page.addInitScript(
    ({ fail, slowSetup }) => {
      Object.defineProperty(navigator, "gpu", {
        configurable: true,
        value: {
          requestAdapter: async () => ({
            features: new Set(["shader-f16"]),
            limits: {
              maxStorageBufferBindingSize: 2 ** 30,
              maxBufferSize: 2 ** 30,
            },
          }),
        },
      });
      const events: unknown[] = [];
      Object.assign(window, { madonTestEvents: events });
      const NativeWorker = window.Worker;
      class MockWorker extends EventTarget {
        onmessage: ((e: MessageEvent) => void) | null = null;
        chunks: string[] = [];
        dead = false;
        constructor(url: string | URL, options?: WorkerOptions) {
          super();
          if (!String(url).includes("/worker-"))
            return new NativeWorker(url, options) as unknown as MockWorker;
        }
        postMessage(message: {
          kind: string;
          uuid: string;
          content: {
            request?: { messages: { content: string }[]; extra_body?: unknown };
          };
        }) {
          events.push(message);
          const reply = (content: unknown, kind = "return") => {
            if (!this.dead)
              this.onmessage?.(
                new MessageEvent("message", {
                  data: { kind, uuid: message.uuid, content },
                }),
              );
          };
          if (message.kind === "reload") {
            setTimeout(
              () =>
                reply(
                  { progress: 0.35, text: "Downloading fixture assets" },
                  "initProgressCallback",
                ),
              10,
            );
            setTimeout(
              () =>
                reply(
                  fail ? "cache unavailable for fixture" : null,
                  fail ? "throw" : "return",
                ),
              slowSetup ? 10_000 : 120,
            );
          } else if (message.kind === "chatCompletionStreamInit") {
            const messages = message.content.request!.messages;
            const last = messages.at(-1)!.content;
            this.chunks = [
              "<thi",
              "nk>private test reasoning",
              "</think>",
              messages.length > 2
                ? "Follow-up answer. "
                : "RAM is working memory. ",
              ...(last.includes("long")
                ? Array(60).fill("More text. ")
                : ["Storage persists data."]),
            ];
            setTimeout(() => reply(null), 0);
          } else if (message.kind === "completionStreamNextChunk") {
            setTimeout(() => {
              const chunk = this.chunks.shift();
              reply(
                chunk === undefined
                  ? undefined
                  : { choices: [{ delta: { content: chunk } }] },
              );
            }, 60);
          } else {
            if (message.kind === "interruptGenerate") this.chunks = [];
            setTimeout(() => reply(null), 0);
          }
        }
        terminate() {
          this.dead = true;
          events.push("terminated");
        }
      }
      window.Worker = MockWorker as unknown as typeof Worker;
    },
    { fail, slowSetup },
  );
}
async function select(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "Gamma", exact: true }).click();
  await page.getByRole("button", { name: /Madon/ }).click();
  await page.getByRole("button", { name: "Download and initialize" }).click();
}
async function ready(page: Page) {
  await expect(
    page.getByText("Madon is initialized and ready.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
}
async function ask(page: Page, input: string) {
  await page.getByRole("textbox", { name: "Message Madon" }).fill(input);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
}
test("mocked worker streams, hides thoughts, passes history and thinking, stops and recovers", async ({
  page,
}) => {
  await mockRuntime(page);
  await select(page);
  await ready(page);
  await page
    .getByRole("combobox", { name: "Thinking mode" })
    .selectOption("off");
  await ask(page, "Explain RAM and storage");
  await expect(page.locator(".assistant .prose")).toContainText(
    "RAM is working memory. Storage persists data.",
  );
  await expect(page.getByRole("button", { name: "Stop response" })).toHaveCount(
    0,
  );
  expect(await page.locator(".assistant").innerText()).not.toContain(
    "private test reasoning",
  );
  await ask(page, "Which one matters more?");
  await expect(page.locator(".assistant").last()).toContainText(
    "Follow-up answer",
  );
  await expect(page.getByRole("button", { name: "Stop response" })).toHaveCount(
    0,
  );
  const requests = await page.evaluate(() =>
    (
      window as unknown as {
        madonTestEvents: {
          kind: string;
          content: { request: { messages: unknown[]; extra_body: unknown } };
        }[];
      }
    ).madonTestEvents
      .filter((m) => m.kind === "chatCompletionStreamInit")
      .map((m) => m.content.request),
  );
  expect(requests[1].messages).toHaveLength(4);
  expect(requests[0].extra_body).toEqual({ enable_thinking: false });
  await page
    .getByRole("combobox", { name: "Thinking mode" })
    .selectOption("on");
  await ask(page, "Give a long answer");
  await expect(page.locator(".assistant").last()).toContainText(
    "Follow-up answer",
  );
  await page.getByRole("button", { name: "Stop response" }).click();
  await expect(page.locator(".assistant").last()).toContainText("Stopped");
  await expect(page.getByRole("button", { name: "Stop response" })).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(() =>
      JSON.stringify(
        (window as unknown as { madonTestEvents: unknown[] }).madonTestEvents,
      ),
    ),
  ).toContain("interruptGenerate");
  await ask(page, "Continue");
  await expect(page.locator(".assistant").last()).toContainText(
    "Follow-up answer",
  );
  await expect(page.getByRole("button", { name: "Stop response" })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Message Madon" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: /Madon · not-initialized/ }),
  ).toBeVisible();
});
test("mocked download cancellation terminates worker and never marks ready", async ({
  page,
}) => {
  await mockRuntime(page, false, true);
  await select(page);
  await expect(page.getByText("Downloading fixture assets")).toBeVisible();
  await page.getByRole("button", { name: "Cancel setup" }).click();
  await expect(
    page.getByText("Model unloaded.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.stringify(
        (window as unknown as { madonTestEvents: unknown[] }).madonTestEvents,
      ),
    ),
  ).toContain("terminated");
});
test("mocked cache failure has recovery and explicit Gamma selection", async ({
  page,
}) => {
  await mockRuntime(page, true);
  await select(page);
  await expect(
    page.getByText("Model storage is unavailable or full.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Switch to Gamma", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Message Gamma" }),
  ).toBeEnabled();
});
test("unsupported WebGPU does not instantiate a worker or download", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", { value: undefined }),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Gamma", exact: true }).click();
  await page.getByRole("button", { name: /Madon/ }).click();
  await expect(
    page.getByText("WebGPU is unavailable.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Download and initialize" }).click();
  await expect(
    page.getByText("WebGPU is unavailable.", { exact: false }),
  ).toBeVisible();
});
test("web retrieval is opt-in, links use retrieved metadata, and commands bypass inference", async ({
  page,
}) => {
  await mockRuntime(page);
  const queries: string[] = [];
  await page.route("https://en.wikipedia.org/w/api.php?*", (route) => {
    queries.push(
      new URL(route.request().url()).searchParams.get("gsrsearch") ?? "",
    );
    return route.fulfill({
      json: {
        query: {
          pages: [{ title: "WebGPU", extract: "A public graphics API." }],
        },
      },
    });
  });
  await select(page);
  await ready(page);
  await ask(page, "/screen");
  await expect(page.locator(".assistant").last()).toContainText(
    "Screen (CSS pixels)",
  );
  expect(
    await page.evaluate(() =>
      JSON.stringify(
        (window as unknown as { madonTestEvents: unknown[] }).madonTestEvents,
      ),
    ),
  ).not.toContain("chatCompletionStreamInit");
  await ask(page, "Look up WebGPU");
  await expect(page.getByRole("button", { name: "Stop response" })).toHaveCount(
    0,
  );
  expect(queries).toEqual([]);
  await page.getByRole("checkbox", { name: /Use web sources/ }).check();
  await ask(page, "Look up WebGPU");
  await expect(
    page.locator(".sources").getByRole("link", { name: "WebGPU" }),
  ).toHaveAttribute("href", "https://en.wikipedia.org/wiki/WebGPU");
  expect(queries).toEqual(["WebGPU"]);
});
test("retrieval failure is explicit and the chat remains usable", async ({
  page,
}) => {
  await mockRuntime(page);
  await select(page);
  await ready(page);
  await page.route("https://en.wikipedia.org/w/api.php?*", (route) =>
    route.fulfill({ status: 429, body: "Rate limit" }),
  );
  await page.getByRole("checkbox", { name: /Use web sources/ }).check();
  await ask(page, "Look up WebGPU");
  await expect(
    page.getByText("Web retrieval failed.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".sources")).toHaveCount(0);
});
