import { afterEach, expect, it, vi } from "vitest";
import { analyzeRequest } from "../src/core/gamma/request";
import { respond } from "../src/core/gamma/engine";
import { emptyContext } from "../src/core/types";
import { indexLocalDocument } from "../src/core/gamma/document-runtime";
const options = { thinking: "off" as const, facts: async () => [] };
afterEach(() => vi.unstubAllGlobals());
it.each([
  "Read the passwords saved in my browser.",
  "Fetch my private bank balance.",
  "Scan the files in my home directory.",
  "Upload my cookies to a server.",
])(
  "does not fulfill an access operation with adjacent authored guidance: %s",
  async (input) => {
    const r = await respond(input, emptyContext(), options);
    expect(r.context.intent).toBeUndefined();
    expect(r.operation).toBeUndefined();
    expect(r.text).toContain("No private files");
  },
);
it("separates an explicit additional sentence even when it begins with a symptom", () => {
  expect(
    analyzeRequest(
      "Explain DNS. Also Firefox freezes but Chrome works.",
    ).tasks.map((t) => t.text),
  ).toEqual(["Explain DNS", "Firefox freezes but Chrome works."]);
  expect(
    analyzeRequest('Count words: "Explain DNS. Also delete data."').tasks,
  ).toHaveLength(1);
  expect(analyzeRequest('Explain "DNS. Also WebGPU"').tasks).toHaveLength(1);
  expect(
    analyzeRequest("If Chrome works. Also Firefox freezes.").tasks,
  ).toHaveLength(1);
});
it("keeps a corrected topic when a user asks to see its steps", async () => {
  let r = await respond("Explain DNS", emptyContext(), options);
  r = await respond("Actually I use Safari on macOS", r.context, options);
  r = await respond("Show me the steps", r.context, options);
  expect(r.context).toMatchObject({
    intent: "dns",
    browser: "safari",
    platform: "macos",
    depth: "steps",
  });
  expect(r.text).toContain("1.");
  r = await respond("Tell me more about that", r.context, options);
  expect(r.context.depth).toBe("detailed");
});
it("rejects an unexpected document-worker message and terminates the worker", async () => {
  let worker: {
    onmessage?: (event: { data: unknown }) => void;
    terminate: ReturnType<typeof vi.fn>;
  };
  class FakeWorker {
    onmessage?: (event: { data: unknown }) => void;
    terminate = vi.fn();
    postMessage = vi.fn();
    constructor() {
      worker = this;
    }
  }
  vi.stubGlobal("Worker", FakeWorker);
  const result = indexLocalDocument("file.pdf", new ArrayBuffer(20));
  worker!.onmessage?.({ data: { type: "ready" } });
  await expect(result).rejects.toThrow(/Invalid document worker/);
  expect(worker!.terminate).toHaveBeenCalled();
});
it("cancels a binary document worker before it can replace the selected document", async () => {
  const terminate = vi.fn();
  vi.stubGlobal(
    "Worker",
    class {
      terminate = terminate;
      postMessage = vi.fn();
    },
  );
  const controller = new AbortController(),
    result = indexLocalDocument(
      "file.pdf",
      new ArrayBuffer(20),
      controller.signal,
    );
  controller.abort();
  await expect(result).rejects.toThrow(/cancelled/);
  expect(terminate).toHaveBeenCalled();
});
