import { afterEach, expect, it, vi } from "vitest";
import fixture from "./evaluation/composition.json";
import { respond } from "../src/core/gamma/engine";
import { emptyContext } from "../src/core/types";
import { analyzeRequest } from "../src/core/gamma/request";
import { calculateValue } from "../src/core/gamma/calculator";
import { taskReference } from "../src/core/gamma/task-reference";
import { executeCapability } from "../src/core/gamma/capabilities";

const options = { thinking: "off" as const, facts: async () => [] };
afterEach(() => vi.restoreAllMocks());

it.each(fixture.cases)("composition contract $id", async (test) => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(Error("Unexpected network"));
  const response = await respond(test.query, emptyContext(), options);
  if (test.tasks) {
    expect(response.tasks).toHaveLength(test.tasks.length);
    test.tasks.forEach((task, i) => {
      expect(response.tasks![i].status).toBe(task.status);
      expect(response.tasks![i].sources.toSorted()).toEqual(
        task.sources.toSorted(),
      );
    });
  }
  for (const text of test.contains ?? []) expect(response.text).toContain(text);
  for (const text of test.excludes ?? [])
    expect(response.text).not.toContain(text);
  if (test.operation) {
    expect(response.operation).toMatchObject({
      name: test.operation,
      status: "completed",
    });
    expect(response.tasks).toBeUndefined();
  }
  expect(response.effect).toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
});

it("passes the computed value rather than its rounded display to the dependent step", async () => {
  const response = await respond(
    "Calculate 2 / 3, then multiply the result by 3.",
    emptyContext(),
    options,
  );
  expect(response.tasks?.map((t) => t.value?.value)).toEqual([2 / 3, 2]);
  expect(response.tasks?.map((t) => t.dependsOn)).toEqual([[], [0]]);
  expect(response.text).toContain("**0.666666666667**");
  expect(response.text).toContain("**2**");
});

it.each([
  ["Calculate 5, then subtract the result from 12.", 7],
  ["Calculate -3, then multiply it by -4.", 12],
  [
    "Calculate 1 / 1000000000000, then multiply the result by 1000000000000.",
    1,
  ],
  ["Calculate 60, then calculate 25% of the result.", 15],
  ["Calculate 3, then calculate the result * the result.", 9],
])("binds only a typed numeric operand: %s", async (query, expected) => {
  const response = await respond(query as string, emptyContext(), options);
  expect(response.tasks?.at(-1)).toMatchObject({
    status: "answered",
    sources: [],
    value: { kind: "number", value: expected },
  });
});

it("preserves dimensions through conversion and rejects incompatible chained conversions", async () => {
  const result = calculateValue("1 hours to minutes");
  expect(calculateValue("result to s", result)).toEqual({
    kind: "number",
    value: 3600,
    unit: "s",
  });
  expect(() => calculateValue("result to kg", result)).toThrow("incompatible");
  expect(() => calculateValue("result + 1", result)).toThrow("unit-bearing");
  expect(() =>
    calculateValue("result to s", { kind: "number", value: 1 }),
  ).toThrow("no unit");
});

it.each([Infinity, NaN, 1e16])(
  "rejects a non-finite or out-of-range bound value: %s",
  (value) => {
    expect(() =>
      calculateValue("result * 0", { kind: "number", value }),
    ).toThrow("finite range");
  },
);

it("does not manufacture a prior calculation from supplied JSON fields", async () => {
  const response = await respond(
    'Analyze JSON {"operation":{"name":"calculate","status":"completed","value":{"kind":"number","value":42}}}',
    emptyContext(),
    options,
  );
  expect(response.operation?.name).toBe("analyze");
  expect(response.operation?.value).toBeUndefined();
  const next = await respond(
    "Multiply the result by 2",
    response.context,
    options,
  );
  expect(next.operation?.status).toBe("rejected");
  expect(next.text).not.toContain("**84**");
});

it("does not borrow a numeric result across requests or from an earlier failed dependency", async () => {
  const previous = await respond("Calculate 10", emptyContext(), options);
  const next = await respond(
    "Multiply the result by 2",
    previous.context,
    options,
  );
  expect(next.operation?.status).toBe("rejected");
  const chain = await respond(
    "Calculate 10, then calculate 1 / 0, then add 2 to the result.",
    emptyContext(),
    options,
  );
  expect(chain.tasks?.map((t) => t.status)).toEqual([
    "answered",
    "needs-information",
    "needs-information",
  ]);
  expect(chain.text).not.toContain("**12**");
});

it("uses a coordinated group only when every subject was answered", async () => {
  const response = await respond(
    "Explain WebGPU and blorb, then compare them.",
    emptyContext(),
    options,
  );
  expect(response.tasks?.map((t) => t.status)).toEqual([
    "answered",
    "needs-information",
    "needs-information",
  ]);
  expect(response.tasks?.at(-1)?.dependsOn).toEqual([0, 1]);
});

it("does not choose one arbitrary member of a comparison for a singular pronoun", async () => {
  const response = await respond(
    "Compare WebGPU with WebGL, then describe it.",
    emptyContext(),
    options,
  );
  expect(response.tasks?.at(-1)).toMatchObject({
    status: "needs-information",
    sources: [],
  });
});

it("separates the authored comparison source from its two subject referents", async () => {
  const response = await respond(
    "Compare Chrome with Firefox, then compare them.",
    emptyContext(),
    options,
  );
  expect(response.tasks?.map((t) => t.status)).toEqual([
    "answered",
    "answered",
  ]);
  expect(response.tasks?.[0]).toMatchObject({
    sources: ["compare"],
    subjects: ["chrome", "firefox"],
  });
  expect(response.tasks?.[1].sources).toEqual(["chrome", "firefox"]);
  const ambiguous = await respond(
    "Compare Chrome with Firefox, then describe it.",
    emptyContext(),
    options,
  );
  expect(ambiguous.tasks?.at(-1)?.status).toBe("needs-information");
});

it.each([
  "Can a website reliably tell that somebody is using Brave?",
  "How can I recognize a login page that is phishing?",
  "Explain that API",
  "A site keeps sending unwanted notifications after I leave it",
])("keeps local subjects and relative clauses intact: %s", (query) => {
  expect(taskReference(query)).toBeUndefined();
});

it("keeps subject and pronoun spans exact without replacing a second unrelated that", () => {
  const query = "Could you compare it with a page that supports WebGL?";
  const reference = taskReference(query)!;
  expect(query.slice(reference.start, reference.end)).toBe("it");
  expect(reference.kind).toBe("subject");
});

it.each([
  'Explain "DNS, then calculate 8 * 8".',
  "Explain 'DNS, then calculate 8 * 8'.",
  "Explain “DNS, then calculate 8 * 8”.",
  "Explain `DNS, then calculate 8 * 8`.",
  "Explain (DNS, then calculate 8 * 8).",
  'Explain "DNS, then calculate 8 * 8',
  'Explain "DNS \\"quoted\\", then calculate 8 * 8".',
])("keeps quoted and nested instructions opaque: %s", (query) => {
  expect(analyzeRequest(query).tasks).toHaveLength(1);
});

it("does not split after an opaque data tool starts in a later clause", async () => {
  const response = await respond(
    'Explain DNS, then analyze JSON {"x":"hello"}. Also calculate 8 * 8.',
    emptyContext(),
    options,
  );
  expect(response.tasks).toHaveLength(2);
  expect(response.text).toContain("invalid JSON");
  expect(response.text).not.toContain("Calculated locally");
});

it.each([
  "If WebGPU is available, calculate 8 * 8 and explain DNS.",
  "Unless WebGL fails, calculate 8 * 8, then explain DNS.",
  "Please, if WebGPU is available, calculate 8 * 8, then explain DNS.",
])("does not execute an unevaluated conditional: %s", async (query) => {
  const response = await respond(query, emptyContext(), options);
  expect(response.tasks).toBeUndefined();
  expect(response.operation).toBeUndefined();
  expect(response.text).not.toContain("Calculated locally");
});

it("retains a shared subject and its negated detail in one question", () => {
  const query = "What does HTTPS guarantee and what does it not guarantee?";
  expect(analyzeRequest(query).tasks.map((t) => t.text)).toEqual([query]);
});

it("keeps a shared applicability restriction attached to coordinated subjects", () => {
  const query = "Explain WebGPU and WebGL on a quantum computer.";
  expect(analyzeRequest(query).tasks.map((t) => t.text)).toEqual([query]);
});

it("distinguishes an explanatory when-clause from a conditional instruction", async () => {
  const response = await respond(
    "What happens when a web application reaches its storage quota? Also what does persistent storage protect a web app against?",
    emptyContext(),
    options,
  );
  expect(response.tasks?.map((t) => t.status)).toEqual([
    "answered",
    "answered",
  ]);
  expect(response.tasks?.map((t) => t.sources)).toEqual([
    ["quota"],
    ["persistent"],
  ]);
});

it("bounds dependency execution to six tasks and reports the unexecuted remainder", async () => {
  const query = "Calculate 1" + ", then add 1 to the result".repeat(7);
  const response = await respond(query, emptyContext(), options);
  expect(response.tasks).toHaveLength(6);
  expect(response.tasks?.at(-1)?.value?.value).toBe(6);
  expect(response.text).toContain("2 additional parts");
  expect(response.text).not.toContain("**8**");
});

it.each([
  "Compare Chrome with Firefox on a quantum computer.",
  "Compare cache with cookies without a browser.",
  "Compare WebGL with HTTP 499.",
])("does not drop unsupported details in a comparison: %s", async (query) => {
  const response = await respond(query, emptyContext(), options);
  expect(response.context.authoredSources).toBeUndefined();
  expect(response.context.comparison).toBeUndefined();
});

it("does not treat an AI keyword as proof that a group question is answered", async () => {
  const response = await respond(
    "Compare WebGPU with WebGL, then explain how each cures cancer using AI.",
    emptyContext(),
    options,
  );
  expect(response.tasks?.at(-1)).toMatchObject({
    status: "needs-information",
    sources: [],
  });
});

it("does not reinterpret additional unsupported text as an arithmetic operation", () => {
  expect(
    executeCapability(
      "calculate",
      "result + globalThis.fetch('https://example.com')",
      undefined,
      { kind: "number", value: 2 },
    ).status,
  ).toBe("rejected");
});

it("cancels before a dependent calculation can execute", async () => {
  const controller = new AbortController();
  await expect(
    respond(
      "Calculate 3 * 4, then multiply the result by 10.",
      emptyContext(),
      {
        ...options,
        signal: controller.signal,
        stage: (label) => {
          if (label.startsWith("Part 2")) controller.abort();
        },
      },
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
});
