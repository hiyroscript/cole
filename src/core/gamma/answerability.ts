import { rewriteQuery } from "./query";
import type { Knowledge } from "../types";
import { entities, understand } from "./language";
import { tokens } from "../text";

export type Answerability = {
  status: "direct" | "partial" | "related" | "conflicting" | "unsupported";
  reasons: string[];
  missing: string[];
};
const framing = new Set(
  "explain describe define tell mean means meaning difference between please would like know understand works work exactly actually give overview introduction basics simple terms beginner briefly".split(
    " ",
  ),
);
export const subjectTerms = (text: string) =>
  tokens(text).filter((t) => !framing.has(t));

// Independent of cosine and rank utilities. This is a conservative evidence
// contract, not entailment by an LLM and not a calibrated probability.
export function assessAnswerability(
  input: string,
  record: Knowledge,
): Answerability {
  const query = understand(rewriteQuery(input));
  const evidence = `${record.title} ${record.phrases.join(" ")} ${record.answer} ${record.steps.join(" ")}`;
  const recordEntities = entities(evidence);
  const missingErrors = query.entities.filter(
    (e) =>
      e.kind === "error" &&
      !recordEntities.some((r) => r.kind === e.kind && r.value === e.value),
  );
  if (missingErrors.length)
    return {
      status: "unsupported",
      reasons: ["Exact technical identifier is absent from the evidence."],
      missing: missingErrors.map((e) => e.value),
    };
  const platform = query.entities
    .findLast((e) => e.kind === "platform")
    ?.value.replace(/windows.*/, "windows")
    .replace("ubuntu", "linux");
  const browser = query.entities.find((e) => e.kind === "browser")?.value;
  if (
    (platform &&
      record.platforms?.length &&
      !record.platforms.some((p) => p.toLowerCase() === platform)) ||
    (browser &&
      record.browsers?.length &&
      !record.browsers.some((b) => b.toLowerCase() === browser))
  )
    return {
      status: "conflicting",
      reasons: ["The record has incompatible applicability."],
      missing: [],
    };
  const terms = [...new Set(subjectTerms(query.positive))];
  const present = new Set(subjectTerms(understand(evidence).positive));
  const missing = terms.filter((t) => !present.has(t));
  const exactSubject = [record.title, ...record.phrases].some((p) => {
    const subject = subjectTerms(understand(p).positive);
    return (
      subject.length > 0 &&
      terms.length === subject.length &&
      terms.every((t) => subject.includes(t))
    );
  });
  if (exactSubject || (terms.length > 0 && missing.length === 0))
    return {
      status: "direct",
      reasons: [
        "Requested terms and identifiers are represented in authored evidence.",
      ],
      missing: [],
    };
  const covered = terms.length - missing.length;
  return {
    status: covered >= 2 ? "partial" : covered ? "related" : "unsupported",
    reasons: ["The record does not establish every requested detail."],
    missing,
  };
}
