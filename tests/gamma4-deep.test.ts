import { afterEach, expect, it, vi } from "vitest";
import { DeepRuntime } from "../src/core/gamma/deep-runtime";
import {
  validDeepInput,
  validateDeepDraft,
} from "../src/core/gamma/deep-config";
import { deepEvidence } from "../src/core/gamma/deep-answer";
import { importDocument } from "../src/core/gamma/documents";
const input = {
  question: "Summarize",
  evidence: [
    {
      id: "D1",
      title: "Report",
      text: "The measured result was 12 ms. Repeat the test.",
    },
  ],
};
afterEach(() => vi.unstubAllGlobals());
it("accepts only bounded evidence and exact attributed quotations", () => {
  expect(validDeepInput(input)).toBe(true);
  expect(
    validDeepInput({
      ...input,
      evidence: [...input.evidence, ...input.evidence],
    }),
  ).toBe(false);
  expect(validDeepInput({ ...input, question: "x".repeat(501) })).toBe(false);
  const draft = {
    answer: "Repeat the test.",
    quotes: [{ id: "D1", text: "Repeat the test." }],
  };
  expect(validateDeepDraft(JSON.stringify(draft), input)).toEqual(draft);
  expect(() =>
    validateDeepDraft(JSON.stringify(draft), {
      ...input,
      evidence: [
        ...input.evidence,
        {
          id: "D2",
          title: "Other report",
          text: "The other report disagrees.",
        },
      ],
    }),
  ).toThrow(/omits/);
  for (const altered of [
    { ...draft, quotes: [{ id: "D2", text: "Repeat the test." }] },
    { ...draft, answer: "The result was 99 ms." },
    { ...draft, answer: "Visit https://example.org" },
    { ...draft, quotes: [{ id: "D1", text: "The result proves causation." }] },
  ])
    expect(() => validateDeepDraft(JSON.stringify(altered), input)).toThrow();
});
it("grounds drafts in selected passages and rejects unsupported tool claims", () => {
  expect(
    deepEvidence("summarize documents", [
      importDocument("notes.txt", "Observed result"),
    ]).evidence[0].text,
  ).toContain("line 1: Observed result");
  expect(() => deepEvidence("summarize documents", [])).toThrow(/Select/);
  expect(() => deepEvidence("Delete all browsing history", [])).toThrow(
    /no directly supported/,
  );
  expect(deepEvidence("What is WebGPU?", []).evidence[0].text).toContain("GPU");
});
class FakeWorker {
  static latest: FakeWorker;
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() {
    FakeWorker.latest = this;
  }
  send(data: unknown) {
    this.onmessage?.({ data });
  }
}
it("requires consent, cancels setup, and can retry", async () => {
  vi.stubGlobal("Worker", FakeWorker);
  const runtime = new DeepRuntime();
  await expect(runtime.initialize(false)).rejects.toThrow(/consent/);
  const pending = runtime.initialize(true);
  const rejected = expect(pending).rejects.toThrow(/cancelled/);
  runtime.disable();
  await rejected;
  expect(FakeWorker.latest.terminate).toHaveBeenCalled();
  const retry = runtime.initialize(true);
  FakeWorker.latest.send({ type: "ready" });
  await retry;
  expect(runtime.getSnapshot().state).toBe("ready");
  runtime.disable();
});
it("rejects malformed worker results without leaving a pending promise", async () => {
  vi.stubGlobal("Worker", FakeWorker);
  const runtime = new DeepRuntime();
  const ready = runtime.initialize(true);
  FakeWorker.latest.send({ type: "ready" });
  await ready;
  await expect(runtime.generate(input, AbortSignal.abort())).rejects.toThrow();
  expect(runtime.getSnapshot().state).toBe("ready");
  const result = runtime.generate(input);
  FakeWorker.latest.send({ type: "result", text: null, ms: 1 });
  await expect(result).rejects.toThrow(/Invalid/);
  expect(runtime.getSnapshot().state).toBe("error");
});
it("terminates inference on abort and removes only its own cache", async () => {
  vi.stubGlobal("Worker", FakeWorker);
  const remove = vi.fn().mockResolvedValue(true);
  vi.stubGlobal("caches", { delete: remove });
  const runtime = new DeepRuntime(),
    ready = runtime.initialize(true);
  FakeWorker.latest.send({ type: "ready" });
  await ready;
  const abort = new AbortController(),
    result = runtime.generate(input, abort.signal);
  abort.abort();
  await expect(result).rejects.toThrow(/cancelled/);
  await runtime.remove();
  expect(remove).toHaveBeenCalledExactlyOnceWith("gamma-deep-v1");
});
it("does not let a cancelled setup overwrite a newer session", async () => {
  vi.stubGlobal("Worker", FakeWorker);
  const runtime = new DeepRuntime(),
    first = runtime.initialize(true);
  const rejection = expect(first).rejects.toThrow(/cancelled/);
  runtime.disable();
  const second = runtime.initialize(true);
  await rejection;
  expect(runtime.getSnapshot().state).toBe("loading");
  FakeWorker.latest.send({ type: "ready", cacheComplete: false });
  await second;
  expect(runtime.getSnapshot().detail).toContain("offline setup may fail");
  const generation = runtime.generate(input);
  FakeWorker.latest.send({ type: "result", text: "data", ms: 1 });
  await generation;
  expect(runtime.getSnapshot().detail).toContain("offline setup may fail");
  runtime.disable();
});
