import { expect, it, vi } from "vitest";
import { respond } from "../src/core/gamma/engine";
import { analyzeRequest } from "../src/core/gamma/request";
import { questionFrame } from "../src/core/gamma/question";
import { evidenceTerms } from "../src/core/gamma/evidence-terms";
import { assessAnswerability } from "../src/core/gamma/answerability";
import { rank, confidence } from "../src/core/gamma/retrieval";
import { validateCandidates } from "../src/core/gamma/evidence-selection";
import { entities } from "../src/core/gamma/language";
import { emptyContext } from "../src/core/types";
import { knowledge } from "../src/data/knowledge";
import { semantic } from "../src/core/gamma/semantic";
const options = { thinking: "off" as const, facts: async () => [] };

it("semantic boosting cannot bypass an unreconciled without-condition", async () => {
  const query = vi.spyOn(semantic, "query").mockResolvedValue([
    { id: "webgpu-adapter", score: 0.95 },
    { id: "webgpu", score: 0.65 },
  ]);
  try {
    const result = await respond(
      "Could you explain WebGPU without an adapter or a GPU?",
      emptyContext(),
      { ...options, enhanced: true },
    );
    expect(result.context.intent).toBeUndefined();
    expect(result.effect).toBeUndefined();
    expect(query).toHaveBeenCalled();
  } finally {
    query.mockRestore();
  }
});

it("a high-ranked wrong error cannot prevent independently supported evidence from answering", () => {
  const candidates = validateCandidates("What does status 415 mean?", [
    {
      record: knowledge.find((r) => r.id === "404")!,
      score: 0.95,
      lexical: 0.9,
      coverage: 0.9,
    },
    {
      record: knowledge.find((r) => r.id === "http415")!,
      score: 0.4,
      lexical: 0.4,
      coverage: 0.4,
    },
  ]);
  expect(candidates[0].record.id).toBe("http415");
  expect(candidates[0].evidenceAccepted).toBe(true);
  expect(confidence([candidates[1]])).toBe("unsupported");
});

it.each([
  ["What is the purpose of WebSockets?", "WebSockets", "purpose"],
  ["Could you give me a brief explanation of ETags?", "ETags", "description"],
  ["Tell me what HTML means, in everyday language.", "HTML", "definition"],
  ["Could you explain what localStorage is?", "localStorage", "definition"],
])(
  "retains an educational frame in the task plan: %s",
  (text, subject, kind) => {
    const task = analyzeRequest(text).tasks[0];
    expect(task.intent).toBe("explain");
    expect(task.subjects).toEqual([subject]);
    expect(task.question).toMatchObject({ subject, kind });
  },
);

it.each([
  "What is the purpose of DNS in curing headaches?",
  "Explain WebGPU without graphics hardware",
  "Explain WebGL if the display driver is missing",
  "What is localStorage used for on a quantum computer?",
])("preserves conditions and unfamiliar content: %s", (text) => {
  const frame = questionFrame(text)!;
  expect(frame.subject).toMatch(
    /curing headaches|without graphics hardware|if the display driver is missing|on a quantum computer/,
  );
});

it.each(["brief", "short"])(
  "a %s explanation starts a new subject rather than replaying the old one",
  async (style) => {
    let result = await respond("Explain DNS", emptyContext(), options);
    result = await respond(
      `Could you give me a ${style} explanation of ETags?`,
      result.context,
      options,
    );
    expect(result.context.intent).toBe("etag");
    expect(result.text).toContain("opaque validator");
    expect(result.context.depth).toBe("brief");
  },
);

it.each(["Repeat that.", "Can you repeat that?", "Tell me more about that."])(
  "retains the topic in a punctuated follow-up: %s",
  async (text) => {
    const first = await respond(
      "What is the purpose of WebSockets?",
      emptyContext(),
      options,
    );
    const result = await respond(text, first.context, options);
    expect(result.context.intent).toBe("websocket");
    expect(result.text).toContain("two-way connection");
  },
);

it("normalizes punctuation and short plurals without merging unrelated short words", () => {
  expect(evidenceTerms("Tabs, APIs and ports.")).toEqual(
    evidenceTerms("tab API port"),
  );
  expect(evidenceTerms("news loss code used")).toEqual([
    "news",
    "loss",
    "code",
    "used",
  ]);
});

it("discovers explanatory evidence absent from aliases without raising rank utility", () => {
  const candidate = rank(
    "Please explain how domain names are translated into network addresses.",
  )[0];
  expect(candidate.record.id).toBe("dns");
  expect(candidate.evidenceAccepted).toBe(true);
  expect(candidate.score).toBeLessThan(0.63);
  expect(candidate.support?.passage).toContain("translates domain names");
});

it.each([
  "HTTP 499",
  "HTTP status 499",
  "status 499",
  "status code 499",
  "error code 499",
])("keeps exact error identity: %s", async (code) => {
  expect(entities(code)).toContainEqual({ kind: "error", value: "http 499" });
  const wrong = knowledge.find((r) => r.id === "404")!;
  expect(assessAnswerability(`What does ${code} mean?`, wrong)).toMatchObject({
    status: "unsupported",
    blocking: true,
  });
  const result = await respond(
    `What does ${code} mean?`,
    emptyContext(),
    options,
  );
  expect(result.context.intent).toBeUndefined();
});

it("does not accept a parent technology when the requested child subject is absent", async () => {
  const result = await respond(
    "How can Content Security Policy block WebAssembly initialization?",
    emptyContext(),
    options,
  );
  expect(result.context.intent).not.toBe("csp");
});

it("rejects an unsupported guaranteed outcome but can answer whether a guarantee exists", async () => {
  const unsupported = await respond(
    "What does Content Security Policy do to guarantee that code is safe?",
    emptyContext(),
    options,
  );
  expect(unsupported.context.intent).toBeUndefined();
  const question = await respond(
    "Does a high display refresh rate guarantee smooth software?",
    emptyContext(),
    options,
  );
  expect(question.context.intent).toBe("refresh");
  expect(question.text).toContain("distinct from a video’s frame rate");
});

it.each(["The second one.", "Tell me about the second topic", "2 please"])(
  "resolves an ordinal clarification only within the offered topics: %s",
  async (text) => {
    const context = { ...emptyContext(), pending: ["dns", "cookies"] };
    const result = await respond(text, context, options);
    expect(result.context.intent).toBe("cookies");
    expect(result.context.pending).toBeUndefined();
    expect(result.effect).toBeUndefined();
  },
);

it("does not execute a topic choice or fabricate an out-of-range choice", async () => {
  for (const text of ["The third one", "Delete the second one"]) {
    const result = await respond(
      text,
      { ...emptyContext(), pending: ["dns", "cookies"] },
      options,
    );
    expect(result.context.intent).toBeUndefined();
    expect(result.effect).toBeUndefined();
  }
});

it("reports partial completion for an explanation followed by an unsupported access request", async () => {
  const result = await respond(
    "What does DNS do? Also read my private password file.",
    emptyContext(),
    options,
  );
  expect(result.tasks?.map((t) => t.status)).toEqual([
    "answered",
    "needs-information",
  ]);
  expect(result.tasks?.[1].sources).toEqual([]);
  expect(result.effect).toBeUndefined();
  expect(result.text).toContain("No private files");
});
