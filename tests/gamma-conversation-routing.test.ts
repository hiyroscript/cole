import { expect, it } from "vitest";
import { respond } from "../src/core/gamma/engine";
import { emptyContext } from "../src/core/types";

const options = { thinking: "auto" as const, facts: async () => [] };

it.each([
  "I have a question",
  "I got a question",
  "Can I ask you something?",
  "Can I ask you a question?",
])("answers conversation opener %s without unsupported fallback", async (input) => {
  const result = await respond(input, emptyContext(), options);
  expect(result.text).toContain("What's your question?");
  expect(result.text).not.toContain("reliable answer");
});

it("clarifies which Google product crashes", async () => {
  const result = await respond(
    "When I open Google it crashes",
    emptyContext(),
    options,
  );
  expect(result.text).toContain("Chrome browser");
  expect(result.text).toContain("Google Search");
  expect(result.text).toContain("Google app");
  expect(result.text).not.toContain("reliable answer");
});

it("routes explicit Chrome crashes to authored crash guidance", async () => {
  const result = await respond(
    "Chrome keeps crashing",
    emptyContext(),
    options,
  );
  expect(result.context.intent).toBe("crash");
  expect(result.text).not.toContain("reliable answer");
});

it("does not infer a crash from a negated report", async () => {
  const result = await respond(
    "Chrome is not crashing, it is slow",
    emptyContext(),
    options,
  );
  expect(result.context.intent).not.toBe("crash");
});
