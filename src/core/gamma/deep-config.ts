export const DEEP_MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
export const DEEP_REVISION = "22942cb7d7ba4cc81bb4673549ca4d4614469b5e";
export const DEEP_WEIGHT_BYTES = 512096557;
export const DEEP_WEIGHT_SHA256 =
  "41834041ab1b29eff9fc592f1a29a1844133aea35832ea9fa91682be13016100";
export const DEEP_CACHE = "gamma-deep-v1";
export type DeepEvidence = {
  id: string;
  title: string;
  text: string;
  url?: string;
};
export type DeepInput = { question: string; evidence: DeepEvidence[] };
export function validDeepInput(value: unknown): value is DeepInput {
  const input = value as DeepInput;
  return (
    !!input &&
    typeof input.question === "string" &&
    input.question.length > 0 &&
    input.question.length <= 500 &&
    Array.isArray(input.evidence) &&
    input.evidence.length > 0 &&
    input.evidence.length <= 4 &&
    input.evidence.every(
      (e) =>
        e &&
        typeof e.id === "string" &&
        /^[KD][1-4]$/.test(e.id) &&
        typeof e.title === "string" &&
        e.title.length <= 200 &&
        typeof e.text === "string" &&
        e.text.length > 0 &&
        e.text.length <= 1800,
    ) &&
    new Set(input.evidence.map((e) => e.id)).size === input.evidence.length &&
    input.evidence.reduce((n, e) => n + e.text.length, 0) <= 3600
  );
}
export type DeepDraft = {
  answer: string;
  quotes: { id: string; text: string }[];
};
export function validateDeepDraft(raw: string, input: DeepInput): DeepDraft {
  if (raw.length > 6000) throw Error("Generated output exceeds its limit.");
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const result = JSON.parse(text) as DeepDraft;
  if (
    !result ||
    typeof result.answer !== "string" ||
    !result.answer.trim() ||
    result.answer.length > 1600 ||
    !Array.isArray(result.quotes) ||
    result.quotes.length < 1 ||
    result.quotes.length > 4
  )
    throw Error("The model did not return a bounded cited draft.");
  if (/https?:|\b(?:javascript|data):/i.test(result.answer))
    throw Error("The model introduced an unverified link.");
  for (const quote of result.quotes) {
    const source = input.evidence.find((e) => e.id === quote?.id);
    if (
      !source ||
      typeof quote.text !== "string" ||
      quote.text.length < 8 ||
      quote.text.length > 600 ||
      !source.text.includes(quote.text)
    )
      throw Error(
        "A generated quotation is not present in the supplied evidence.",
      );
  }
  if (input.evidence.some((e) => !result.quotes.some((q) => q.id === e.id)))
    throw Error("The draft omits one of the supplied sources.");
  const sourceNumbers = new Set(
    input.evidence.flatMap((e) => e.text.match(/\d+(?:\.\d+)?/g) ?? []),
  );
  if (
    (result.answer.match(/\d+(?:\.\d+)?/g) ?? []).some(
      (n) => !sourceNumbers.has(n),
    )
  )
    throw Error("The model introduced an unsupported number.");
  return result;
}
