import "fake-indexeddb/auto";
import { it, expect, vi, afterEach } from "vitest";
import {
  normalizeConversation,
  validConversation,
  putConversation,
  loadConversations,
  clearConversations,
  preferences,
} from "../src/lib/storage";
import { emptyContext, type Conversation } from "../src/core/types";
import { executeCommand } from "../src/core/commands";
afterEach(() => vi.unstubAllGlobals());
it("normalizes legacy model metadata without rewriting freeform content or dropping evidence", async () => {
  await clearConversations();
  const old = {
    id: "legacy",
    title: "Zulvyn notes",
    pinned: true,
    updated: 42,
    context: {
      ...emptyContext(),
      intent: "slow",
      flow: { id: "slow", step: 0 },
    },
    messages: [
      {
        id: "u",
        role: "user",
        text: "Zulvyn, my browser is slow",
        contextBefore: emptyContext(),
      },
      {
        id: "a",
        role: "assistant",
        model: "zulvyn",
        text: "Zulvyn’s old answer",
        evidence: [
          { label: "Memory", value: "8", kind: "Estimated", group: "Device" },
        ],
      },
      {
        id: "m",
        role: "assistant",
        model: "madon",
        modelVersion: "existing",
        text: "Madon answer",
      },
    ],
  };
  await putConversation(old as Conversation);
  const [loaded] = await loadConversations();
  expect(loaded).toEqual({
    ...old,
    messages: old.messages.map((m) =>
      m.model === "zulvyn" ? { ...m, model: "gamma" } : m,
    ),
  });
  expect(validConversation(loaded)).toBe(true);
});
it("invalid optional flow state does not discard messages", () => {
  const old = {
    id: "x",
    title: "x",
    pinned: false,
    updated: 1,
    context: {
      ...emptyContext(),
      flow: { id: "slow", step: 99 },
      diagnosis: { id: "gone", node: "bad" },
    },
    messages: [],
  };
  const result = normalizeConversation(old) as Conversation;
  expect(validConversation(result)).toBe(true);
  expect(result.context.flow).toBeUndefined();
  expect(result.context.diagnosis).toBeUndefined();
});
it("preserves settings while mapping the old default", () => {
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify({
        model: "zulvyn",
        theme: "dark",
        thinking: "on",
        device: "laptop",
        name: "Sam",
        webSources: true,
      }),
  });
  expect(preferences()).toMatchObject({
    model: "gamma",
    theme: "dark",
    thinking: "on",
    device: "laptop",
    name: "Sam",
    webSources: true,
  });
});
it("accepts the legacy command without advertising the old name", async () => {
  const response = await executeCommand("model", "zulvyn", emptyContext(), []);
  expect(response.effect).toEqual({ type: "model", value: "gamma" });
  expect(response.text).toContain("Gamma");
  expect(
    (await executeCommand("help", "", emptyContext(), [])).text,
  ).not.toMatch(/zulvyn/i);
});
