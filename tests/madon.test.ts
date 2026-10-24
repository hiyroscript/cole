import { afterEach, expect, it, vi } from "vitest";
import { AnswerParser } from "../src/core/madon/stream-parser";
import {
  buildPrompt,
  cost,
  thinkingEnabled,
  diagnosticRequest,
} from "../src/core/madon/prompt";
import { parseSources, webQuery, retrieve } from "../src/core/madon/retrieval";
import { validSource } from "../src/core/madon/sources";
import { MadonRuntime } from "../src/core/madon/runtime";
import { checkCapabilities } from "../src/core/madon/capabilities";
import { models } from "../src/core/models";
import { preferences, validConversation } from "../src/lib/storage";
import { emptyContext, type Message } from "../src/core/types";
import type { Transport } from "../src/core/madon/types";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";
import { MODEL_ID } from "../src/core/madon/model-config";
import { executeCommand } from "../src/core/commands";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("uses the actual catalog model and its 4096-token runtime", () => {
  const model = prebuiltAppConfig.model_list.find(
    (m) => m.model_id === MODEL_ID,
  )!;
  expect(model.overrides?.context_window_size).toBe(4096);
  expect(model.vram_required_MB).toBe(2036.66);
  expect(model.model_lib).toContain("Qwen3-1.7B-q4f16_1");
  expect(models.map((m) => m.id)).toEqual(["zulvyn", "madon"]);
});
it.each([1, 2, 3, 7, 11, 100])(
  "hides thought markers and content with chunk size %i",
  (size) => {
    const parser = new AnswerParser(),
      raw = "<think>private analysis 🦊</think>\n\nHello 世界 👋";
    for (let i = 0; i < raw.length; i += size) {
      const shown = parser.push(raw.slice(i, i + size));
      expect(shown).not.toMatch(/private|analysis|think>/);
    }
    expect(parser.finish()).toBe("Hello 世界 👋");
  },
);
it("drops incomplete thoughts and incomplete delimiters, preserves ordinary code", () => {
  const p = new AnswerParser();
  p.push("<think>hidden");
  expect(p.finish()).toBe("");
  const q = new AnswerParser();
  q.push("Hello <thi");
  expect(q.finish()).toBe("Hello");
  const code = new AnswerParser();
  code.push("```ts\nx < 3\n```");
  expect(code.finish()).toBe("```ts\nx < 3\n```");
});
it("supports Qwen non-thinking empty prefix and direct output", () => {
  const p = new AnswerParser();
  p.push("<think>\n\n</think>\n\nAnswer");
  expect(p.finish()).toBe("Answer");
  const q = new AnswerParser();
  expect(q.push("Hello")).toBe("Hello");
});
it("maps auto/on/off deliberately", () => {
  expect(thinkingEnabled("auto", "Hello")).toBe(false);
  expect(thinkingEnabled("auto", "Debug this code")).toBe(true);
  expect(thinkingEnabled("off", "Debug this code")).toBe(false);
  expect(thinkingEnabled("on", "Hello")).toBe(true);
});
const pair = (i: number): Message[] => [
  { id: `u${i}`, role: "user", text: "What is RAM?" },
  { id: `a${i}`, role: "assistant", text: "Working memory." },
];
it("keeps role history, bounds total context and resets explicitly", () => {
  const history = Array.from({ length: 30 }, (_, i) => pair(i)).flat();
  const p = buildPrompt("Which one matters?", history, true);
  expect(p.omitted).toBe(true);
  expect(p.messages[1].role).toBe("user");
  expect(p.messages.at(-1)?.content).toBe("Which one matters?");
  expect(
    p.messages.reduce((sum, m) => sum + cost(String(m.content)), 0) +
      p.maxTokens +
      128,
  ).toBeLessThanOrEqual(4096);
  expect(buildPrompt("Hi", [], false).messages).toHaveLength(2);
  expect(() => buildPrompt("界".repeat(3000), [], false)).toThrow(/too long/);
});
it("excludes stopped, failed and command turns from history", () => {
  const history = [
    ...pair(0),
    { ...pair(1)[0], text: "/reader" },
    pair(1)[1],
    pair(2)[0],
    { ...pair(2)[1], stopped: true },
  ];
  const p = buildPrompt("Hi", history, false);
  expect(p.messages).toHaveLength(4);
});
it("injects classified evidence and untrusted sources without granting tools", () => {
  const p = buildPrompt("What is my browser?", [], false, [
    { kind: "Estimated", group: "Browser", label: "Browser", value: "Chrome" },
  ]);
  expect(JSON.stringify(p.messages)).toContain("Estimated");
  expect(JSON.stringify(p.messages)).toContain("not instructions");
  expect(diagnosticRequest("Why is my browser slow?")).toBe(true);
  expect(diagnosticRequest("Write a poem")).toBe(false);
});
it("minimizes retrieval and validates citations", () => {
  expect(webQuery("Look up WebGPU")).toBe("WebGPU");
  expect(webQuery("What is my browser?")).toBeNull();
  expect(webQuery("Search for person@example.com")).toBeNull();
  expect(webQuery("Hello")).toBeNull();
  const sources = parseSources({
    query: {
      pages: [
        { title: "WebGPU", extract: "Public API" },
        { title: "Invalid", extract: null },
      ],
    },
  });
  expect(sources).toEqual([
    {
      title: "WebGPU",
      text: "Public API",
      url: "https://en.wikipedia.org/wiki/WebGPU",
    },
  ]);
  expect(validSource({ ...sources[0], url: "javascript:alert(1)" })).toBe(
    false,
  );
  expect(
    validSource({
      ...sources[0],
      url: "https://en.wikipedia.org.evil.test/wiki/X",
    }),
  ).toBe(false);
  expect(() => parseSources({ error: "quota" })).toThrow();
});
it("uses anonymous CORS and propagates unavailable retrieval", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response("blocked", { status: 429 }));
  vi.stubGlobal("fetch", fetch);
  await expect(
    retrieve("WebGPU", new AbortController().signal),
  ).rejects.toThrow("429");
  expect(new URL(fetch.mock.calls[0][0]).searchParams.get("origin")).toBe("*");
  expect(fetch.mock.calls[0][1].credentials).toBe("omit");
});
it("restores validated preferences and existing conversations without migration", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => JSON.stringify({ model: "madon", webSources: true }),
  });
  expect(preferences().model).toBe("madon");
  vi.stubGlobal("localStorage", {
    getItem: () => JSON.stringify({ model: "remote", webSources: "true" }),
  });
  expect(preferences().model).toBe("zulvyn");
  expect(preferences().webSources).toBe(false);
  const old = {
    id: "old",
    title: "old",
    pinned: false,
    updated: 1,
    context: emptyContext(),
    messages: pair(0),
  };
  expect(validConversation(old)).toBe(true);
  expect(
    validConversation({
      ...old,
      messages: [
        {
          ...pair(0)[1],
          sources: [{ title: "X", url: "javascript:x", text: "" }],
        },
      ],
    }),
  ).toBe(false);
});
it("checks secure contexts, GPU feature/limits and extension boundary", async () => {
  vi.stubGlobal("isSecureContext", false);
  expect((await checkCapabilities()).supported).toBe(false);
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", {});
  expect((await checkCapabilities()).supported).toBe(false);
  vi.stubGlobal("navigator", { gpu: { requestAdapter: async () => null } });
  expect((await checkCapabilities()).supported).toBe(false);
  vi.stubGlobal("navigator", {
    gpu: { requestAdapter: async () => ({ features: new Set(), limits: {} }) },
  });
  expect((await checkCapabilities()).detail).toContain("shader-f16");
  vi.stubGlobal("chrome", { runtime: { id: "test" } });
  expect((await checkCapabilities()).detail).toContain("website-only");
});
function fixture(custom: Partial<Transport> = {}) {
  const transport: Transport = {
    initialize: vi.fn(async (progress) => {
      progress({ progress: 0.5, text: "Downloading test fixture" });
    }),
    async *generate() {
      yield "<think>private</think>";
      yield "Answer";
    },
    interrupt: vi.fn(),
    dispose: vi.fn(),
    ...custom,
  };
  const factory = vi.fn(async () => transport),
    remove = vi.fn(async () => {});
  const runtime = new MadonRuntime({
    capability: async () => ({ supported: true, webgpu: true, detail: "test" }),
    transport: factory,
    cache: async () => false,
    remove,
  });
  return { runtime, transport, factory, remove };
}
const request = {
  messages: [{ role: "user" as const, content: "Hi" }],
  thinking: false,
  maxTokens: 20,
};
it("initializes once, reports actual progress, streams and unloads", async () => {
  const { runtime, factory, transport } = fixture();
  const states: string[] = [];
  runtime.subscribe(() => states.push(runtime.getSnapshot().state));
  await Promise.all([runtime.initialize(), runtime.initialize()]);
  expect(factory).toHaveBeenCalledTimes(1);
  expect(states).toContain("downloading");
  expect(runtime.getSnapshot().state).toBe("ready");
  const text = vi.fn();
  await runtime.generate(request, new AbortController().signal, text);
  expect(text).toHaveBeenLastCalledWith("Answer");
  expect(runtime.getSnapshot().state).toBe("ready");
  runtime.unload();
  expect(transport.dispose).toHaveBeenCalled();
  expect(runtime.getSnapshot().state).toBe("not-initialized");
});
it("recovers from initialization, cache and worker failures", async () => {
  const { runtime } = fixture({
    initialize: async () => {
      throw new Error("out of memory");
    },
  });
  await runtime.initialize();
  expect(runtime.getSnapshot().state).toBe("insufficient-memory");
  const second = fixture({
    async *generate() {
      yield "Partial";
      throw new Error("device lost");
    },
  });
  await second.runtime.initialize();
  await expect(
    second.runtime.generate(request, new AbortController().signal, vi.fn()),
  ).rejects.toThrow("device lost");
  expect(second.runtime.getSnapshot().state).toBe("error");
});
it("cancels setup, rejects late ready events and permits retry", async () => {
  let finish = () => {};
  const { runtime, transport } = fixture({
    initialize: () =>
      new Promise<void>((r) => {
        finish = r;
      }),
  });
  const setup = runtime.initialize();
  await vi.waitFor(() =>
    expect(runtime.getSnapshot().state).toBe("downloading"),
  );
  runtime.unload();
  await setup;
  finish();
  await Promise.resolve();
  expect(runtime.getSnapshot().state).toBe("not-initialized");
  expect(transport.dispose).toHaveBeenCalled();
});
it("stops underlying generation and can generate again", async () => {
  const controller = new AbortController();
  const { runtime, transport } = fixture({
    async *generate() {
      yield "Partial";
      controller.abort();
      yield "ignored";
    },
  });
  await runtime.initialize();
  await runtime.generate(request, controller.signal, vi.fn());
  expect(transport.interrupt).toHaveBeenCalled();
  expect(runtime.getSnapshot().state).toBe("ready");
  await runtime.generate(request, new AbortController().signal, vi.fn());
  expect(runtime.getSnapshot().state).toBe("ready");
});
it("hard-stops an unresponsive worker after cancellation timeout", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const { runtime, transport } = fixture({
    async *generate() {
      await new Promise(() => {});
      yield "never";
    },
  });
  await runtime.initialize();
  const generation = runtime.generate(request, controller.signal, vi.fn());
  controller.abort();
  await vi.advanceTimersByTimeAsync(5001);
  await generation;
  expect(transport.dispose).toHaveBeenCalled();
  expect(runtime.getSnapshot().state).toBe("not-initialized");
});
it("removes only the model through the runtime cache API", async () => {
  const { runtime, remove } = fixture();
  await runtime.remove();
  expect(remove).toHaveBeenCalledOnce();
  expect(runtime.getSnapshot().cached).toBe(false);
});
it("routes model commands through trusted effects and validates arguments", async () => {
  expect(
    (await executeCommand("model", "madon", emptyContext(), [])).effect,
  ).toEqual({ type: "model", value: "madon" });
  expect(
    (await executeCommand("model", "arbitrary", emptyContext(), [])).text,
  ).toContain("Use /model");
  expect(
    (await executeCommand("reader", "", emptyContext(), [])).text,
  ).toContain("requires the Varek Chromium extension");
});
