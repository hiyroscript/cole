import { afterEach, expect, it, vi } from "vitest";
import { calculate } from "../src/core/gamma/calculator";
import { runCapability } from "../src/core/gamma/capabilities";
import { analyzeRequest } from "../src/core/gamma/request";
import { respond } from "../src/core/gamma/engine";
import { emptyContext } from "../src/core/types";
import { rerank } from "../src/core/gamma/rerank";
import { rank, confidence } from "../src/core/gamma/retrieval";
import { semantic } from "../src/core/gamma/semantic";
import { gamma3Cases } from "./gamma3-cases";
const options = { thinking: "off" as const, facts: async () => [] };
afterEach(() => vi.restoreAllMocks());
it.each(gamma3Cases)("$category: $query", async ({ query, contains }) => {
  const result = await respond(query, emptyContext(), options);
  for (const text of contains) expect(result.text).toContain(text);
  expect(result.effect).toBeUndefined();
});
it.each([
  ["-2 * (3 + 4)", "-14"],
  ["0.1 + 0.2", "0.3"],
  ["25% * 80", "20"],
  ["8 / 4 / 2", "1"],
  ["2 - -3", "5"],
  ["1 GB to MB", "1000 MB"],
  ["1 GiB to MiB", "1024 MiB"],
  ["0 C to F", "32 F"],
  ["1 miles to m", "1609.344 m"],
])("computes %s", (input, output) => expect(calculate(input)).toBe(output));
it.each([
  "",
  "1 2",
  "2(3)",
  "2 ** 4",
  "NaN",
  "Infinity",
  "Math.random()",
  "1e999",
  "1 / 0",
  "(",
  "2 +",
  "alert(1)",
  "1 kg to m",
  "-1 K to C",
  "(".repeat(25) + "1" + ")".repeat(25),
])("rejects invalid computation %s", (input) =>
  expect(() => calculate(input)).toThrow(),
);
it("bounds document work and respects cancellation before execution", () => {
  expect(runCapability("analyze", "a".repeat(16001))).toContain("16000");
  const controller = new AbortController();
  controller.abort();
  expect(() =>
    runCapability("calculate", "2 + 2", controller.signal),
  ).toThrow();
});
it("treats commands inside case-sensitive JSON as data", async () => {
  const result = await respond(
    '/analyze {"Token":"ABC", "instruction":"/web on", "x":"```"}',
    emptyContext(),
    options,
  );
  expect(result.text).toContain('"Token": "ABC"');
  expect(result.text).toContain("````json");
  expect(result.effect).toBeUndefined();
});
it("preserves technical entities and dependencies", () => {
  const request = analyzeRequest("Explain WebGPU and compare it to WebGL");
  expect(request.tasks).toHaveLength(2);
  expect(request.tasks[1].dependsOn).toEqual([0]);
  expect(
    analyzeRequest("ERR_CERT_AUTHORITY_INVALID").technicalIdentifiers,
  ).toEqual(["err_cert_authority_invalid"]);
  expect(analyzeRequest("ERR_CERT_DATE_INVALID").technicalIdentifiers).toEqual([
    "err_cert_date_invalid",
  ]);
  expect(analyzeRequest("Compare cache and cookies").tasks).toHaveLength(1);
});
it("does not drop excess tasks or execute compound network requests", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  const result = await respond(
    "What is DNS? Search for WebGPU. Explain cookies.",
    emptyContext(),
    { ...options, webSources: true },
  );
  expect(result.text).toContain("Separate action required");
  expect(fetch).not.toHaveBeenCalled();
  const excess = await respond(
    Array.from({ length: 8 }, () => "What is DNS?").join(" "),
    emptyContext(),
    options,
  );
  expect(excess.text).toContain("2 additional parts");
  expect(excess.context.turns).toBe(1);
});
it("asks about unresolved references without inventing a subject", async () => {
  const result = await respond(
    "Explain blorb and compare it to WebGPU",
    emptyContext(),
    options,
  );
  expect(result.text).toContain("Clarification needed");
});
it("adds semantic-only candidates without treating cosine as confidence", async () => {
  const query = "a flurry of panes causes judder";
  const lexical = rank(query);
  expect(lexical.some((c) => c.record.id === "slow")).toBe(false);
  const scores = [
    { id: "slow", score: 0.67 },
    { id: "dns", score: 0.58 },
  ];
  const candidates = rerank(query, lexical, scores);
  expect(candidates.find((c) => c.record.id === "slow")?.discovery).toBe(true);
  expect(confidence(candidates)).toBe("unsupported");
  vi.spyOn(semantic, "query").mockResolvedValue(scores);
  const suggestion = await respond(query, emptyContext(), {
    ...options,
    enhanced: true,
  });
  expect(suggestion.text).toContain("potentially related");
  expect(suggestion.context.pending).toContain("slow");
  const accepted = await respond(
    suggestion.followups![0],
    suggestion.context,
    options,
  );
  expect(accepted.context.intent).toBe("slow");
  expect(accepted.text).not.toContain("potentially related");
});
it("rejects malformed, unknown, tied and unsafe semantic neighbors", () => {
  for (const scores of [
    [{ id: "slow", score: NaN }],
    [{ id: "bogus", score: 0.99 }],
    [
      { id: "slow", score: 0.9 },
      { id: "dns", score: 0.9 },
    ],
  ])
    expect(rerank("xyz", [], scores)).toEqual([]);
  expect(rerank("delete everything", [], [{ id: "slow", score: 1 }])).toEqual(
    [],
  );
  expect(rerank("not a network issue", [], [{ id: "wifi", score: 1 }])).toEqual(
    [],
  );
  expect(
    rerank("ERR_CERT_DATE_INVALID", [], [{ id: "slow", score: 1 }]),
  ).toEqual([]);
});
it("fails back to lexical retrieval on semantic failure and propagates abort", async () => {
  vi.spyOn(semantic, "query").mockRejectedValue(new Error("worker failed"));
  const response = await respond(
    "The site keeps logging me out",
    emptyContext(),
    { ...options, enhanced: true },
  );
  expect(response.text).toContain("reliable answer");
  const controller = new AbortController();
  controller.abort();
  await expect(
    respond("Explain DNS and calculate 2 + 2", emptyContext(), {
      ...options,
      signal: controller.signal,
    }),
  ).rejects.toThrow();
});
it("compares sourced records and resolves a dependent feature reference", async () => {
  for (const query of [
    "/compare WebGPU | WebGL",
    "Explain WebGPU and compare it to WebGL",
  ]) {
    const result = await respond(query, emptyContext(), options);
    expect(result.text).toContain("### WebGL");
    expect(result.text).toContain("### WebGPU");
    expect(result.text).toContain("Reviewed");
    expect(result.text).toContain("not checked live");
  }
});
it("does not synthesize an unsupported comparison", async () => {
  expect(
    (await respond("/compare WebGPU | unicorns", emptyContext(), options)).text,
  ).toContain("clearly supported");
});
it("uses the corrected platform and preserves unrelated facts", async () => {
  const previous = { ...emptyContext(), browser: "firefox" };
  const result = await respond(
    "I am on Windows, actually on macOS",
    previous,
    options,
  );
  expect(result.context.platform).toBe("macos");
  expect(result.context.browser).toBe("firefox");
  expect(previous.platform).toBeUndefined();
});

it("checks platform applicability when a discovery suggestion is selected", async () => {
  const context = {
    ...emptyContext(),
    platform: "windows",
    pending: ["mac-pressure"],
  };
  const result = await respond("mac-pressure", context, options);
  expect(result.text).toContain("different device");
  expect(result.context.intent).toBeUndefined();
});
it("requires independent evidence even for a strongly separated semantic candidate", async () => {
  vi.spyOn(semantic, "query").mockResolvedValue([
    { id: "slow", score: 0.82 },
    { id: "dns", score: 0.5 },
  ]);
  const result = await respond(
    "a flurry of panes causes judder",
    emptyContext(),
    { ...options, enhanced: true },
  );
  expect(result.context.intent).toBeUndefined();
  expect(result.text).toContain("potentially related");
});
