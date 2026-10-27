import { executionRequirement } from "./requirements";
import { rewriteQuery } from "./query";
import type { Knowledge } from "../types";
import { entities, understand } from "./language";
import { evidenceTerms } from "./evidence-terms";

export type Answerability = {
  status: "direct" | "partial" | "related" | "conflicting" | "unsupported";
  reasons: string[];
  missing: string[];
  passage?: string;
  blocking?: boolean;
};
export const subjectTerms = evidenceTerms;

// Independent of cosine and rank utilities. This is a conservative evidence
// contract, not entailment by an LLM and not a calibrated probability.
export function assessAnswerability(
  input: string,
  record: Knowledge,
): Answerability {
  const requirement = executionRequirement(input);
  if (requirement)
    return {
      status: "unsupported",
      reasons: [
        "Authored guidance cannot establish execution or current verification.",
      ],
      missing: [requirement.kind],
    };
  const query = understand(rewriteQuery(input));
  if (
    /^(?:(?:can|could|would) you\s+)?(?:inspect|read|access|scan|execute|run|delete|erase|send|upload|download|install|enable|disable|search|look up)\b/i.test(
      input.trim(),
    )
  )
    return {
      status: "unsupported",
      reasons: [
        "An explanation cannot establish execution of the requested operation.",
      ],
      missing: ["authorized tool result"],
    };
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
      blocking: true,
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
      blocking: true,
      reasons: ["The record has incompatible applicability."],
      missing: [],
    };
  const terms = [...new Set(subjectTerms(query.positive))];
  const subjectEntities = entities(
    record.title + " " + record.phrases.join(" "),
  );
  const unrelatedSubjects = query.entities.filter(
    (e) =>
      e.kind === "api" &&
      !subjectEntities.some((r) => r.kind === e.kind && r.value === e.value),
  );
  if (unrelatedSubjects.length)
    return {
      status: "related",
      blocking: true,
      reasons: [
        "Requested technical subject is only incidental to this record.",
      ],
      missing: unrelatedSubjects.map((e) => e.value),
    };
  if (/\b(?:not|never|without|dont|doesnt|isnt)\b/.test(query.normalized)) {
    const authoredCondition = [record.title, ...record.phrases].some(
      (label) =>
        understand(rewriteQuery(label)).normalized === query.normalized,
    );
    return {
      status: "partial",
      // Presentation-only “without jargon” has already been removed by the
      // question frame. Preserve exact authored diagnostic labels, but a
      // lexical utility or semantic boost cannot reconcile new conditions.
      blocking: /\bwithout\b/.test(query.normalized) && !authoredCondition,
      reasons: [
        "Negated conditions need explicit reconciliation before expanded acceptance.",
      ],
      missing: ["condition validation"],
    };
  }
  // Require a coherent authored passage, not words scattered across aliases
  // and unrelated procedural steps. Titles provide the explicit subject.
  const passages = record.answer.split(/(?<=[.!?])\s+/);
  const passage = passages
    .map((sentence, i) => [sentence, passages[i + 1]].filter(Boolean).join(" "))
    .find((text) => {
      const present = new Set(subjectTerms(`${record.title} ${text}`));
      return terms.every((t) => present.has(t));
    });
  const present = new Set(subjectTerms(`${record.title} ${record.answer}`));
  const missing = terms.filter((t) => !present.has(t));
  const exactSubject = [record.title, ...record.phrases].some((p) => {
    const subject = subjectTerms(understand(p).positive);
    return (
      subject.length > 0 &&
      terms.length === subject.length &&
      terms.every((t) => subject.includes(t))
    );
  });
  const contextWords = new Set(["browser", "site", "website", "tab"]);
  const contextualExpression = record.phrases.some((phrase) => {
    const expression = subjectTerms(understand(phrase).positive);
    return (
      expression.length >= 2 &&
      expression.every((t) => terms.includes(t)) &&
      terms.every((t) => expression.includes(t) || contextWords.has(t))
    );
  });
  if (exactSubject || contextualExpression || (terms.length >= 2 && passage))
    return {
      status: "direct",
      reasons: [
        "Requested terms and identifiers are represented in authored evidence.",
      ],
      missing: [],
      passage: passage ?? record.answer,
    };
  const covered = terms.length - missing.length;
  // A presupposed guaranteed outcome needs supporting detail. A yes/no
  // question asking whether a guarantee exists may be answered by a caveat.
  const absoluteClaim =
    /\b(?:to|that|which)\s+guarantees?\b|^(?:explain\s+)?(?:why|how)\b.*\b(?:guarantees?|always|unlimited|unrestricted)\b/i.test(
      input,
    );
  return {
    status: covered >= 2 ? "partial" : covered ? "related" : "unsupported",
    reasons: ["The record does not establish every requested detail."],
    missing,
    blocking: absoluteClaim && missing.length > 0,
  };
}
