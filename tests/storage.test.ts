import "fake-indexeddb/auto";
import { it, expect, beforeEach } from "vitest";
import {
  clearConversations,
  putConversation,
  loadConversations,
  deleteConversation,
  validConversation,
} from "../src/lib/storage";
import { emptyContext, type Conversation } from "../src/core/types";
beforeEach(() => clearConversations());
const chat = (): Conversation => ({
  id: "one",
  title: "Test",
  pinned: false,
  updated: Date.now(),
  messages: [{ id: "m", role: "user", text: "Hello" }],
  context: emptyContext(),
});
it("persists and restores a conversation", async () => {
  const c = chat();
  await putConversation(c);
  expect(await loadConversations()).toEqual([c]);
});
it("deletes only the selected conversation", async () => {
  await putConversation(chat());
  await putConversation({ ...chat(), id: "two" });
  await deleteConversation("one");
  expect((await loadConversations()).map((c) => c.id)).toEqual(["two"]);
});
it("clears all history", async () => {
  await putConversation(chat());
  await clearConversations();
  expect(await loadConversations()).toEqual([]);
});
it("validates unknown stored input", () => {
  expect(validConversation({ messages: [] })).toBe(false);
  expect(
    validConversation({ ...chat(), messages: [{ role: "system", text: "x" }] }),
  ).toBe(false);
});
