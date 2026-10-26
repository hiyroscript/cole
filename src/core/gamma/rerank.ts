import { assessAnswerability } from "./answerability";
import { confidence, type Candidate } from "./retrieval";
import { understand, entities } from "./language";
import { knowledge } from "../../data/knowledge";

// Development-calibrated gates, not probabilities. Exact lexical matches,
// risky actions, exclusions and applicability always take precedence.
export const semanticPolicy = { floor: 0.7, margin: 0.1, lexicalWeight: 0.5 };

export function rerank(
  input: string,
  lexical: Candidate[],
  scores: { id: string; score: number }[],
  policy = semanticPolicy,
): Candidate[] {
  const records = new Map(knowledge.map((k) => [k.id, k]));
  const request = understand(input);
  if (lexical[0]?.score === 1 || request.dangerous || request.excluded.length)
    return lexical;
  const valid = [
    ...new Map(
      scores
        .filter(
          (s) =>
            records.has(s.id) &&
            Number.isFinite(s.score) &&
            s.score >= -1 &&
            s.score <= 1,
        )
        .map((s) => [s.id, s]),
    ).values(),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  const similarities = new Map(valid.map((s) => [s.id, s.score]));
  const candidates = lexical.map((c) => {
    if (c.record.risk && c.record.risk !== "low") return c;
    return {
      ...c,
      score: Math.min(
        0.99,
        c.score +
          ((similarities.get(c.record.id) ?? 0) >= 0.65 && c.coverage >= 0.5
            ? 0.06
            : 0),
      ),
    };
  });
  const lexicalAccepted = ["high", "moderate"].includes(confidence(candidates));
  const semanticAccepted =
    valid.length >= 2 &&
    valid[0].score >= policy.floor &&
    valid[0].score - valid[1].score >= policy.margin;
  // Weaker separated neighbors can still ask a targeted clarification.
  if (
    valid[0]?.score >= 0.6 &&
    valid[0].score - (valid[1]?.score ?? 0) >= 0.06
  ) {
    const lexicalIds = new Set(lexical.map((c) => c.record.id));
    for (const [rank, s] of valid.slice(0, 3).entries()) {
      const record = records.get(s.id)!;
      if (
        lexicalIds.has(s.id) ||
        s.score < 0.6 ||
        (record.risk && record.risk !== "low")
      )
        continue;
      if (understand(record.title + " " + record.phrases.join(" ")).dangerous)
        continue;
      const requestedErrors = request.entities.filter(
        (e) => e.kind === "error",
      );
      const recordErrors = entities(
        record.title + " " + record.phrases.join(" "),
      ).filter((e) => e.kind === "error");
      if (
        requestedErrors.some(
          (e) => !recordErrors.some((r) => r.value === e.value),
        )
      )
        continue;
      const platform = request.entities
        .find((e) => e.kind === "platform")
        ?.value.replace(/windows.*/, "windows")
        .replace("ubuntu", "linux");
      if (
        platform &&
        record.platforms?.length &&
        !record.platforms.some((p) => p.toLowerCase() === platform)
      )
        continue;
      const browser = request.entities.find((e) => e.kind === "browser")?.value;
      if (
        browser &&
        record.browsers?.length &&
        !record.browsers.some((b) => b.toLowerCase() === browser)
      )
        continue;
      candidates.push({
        record,
        lexical: 0,
        coverage: 0,
        score: 0.62,
        discovery: !(
          rank === 0 &&
          semanticAccepted &&
          !lexicalAccepted &&
          assessAnswerability(input, record).status === "direct"
        ),
        semanticAccepted:
          rank === 0 &&
          semanticAccepted &&
          !lexicalAccepted &&
          assessAnswerability(input, record).status === "direct",
      });
    }
  }
  for (const c of candidates) {
    const lexicalRank = lexical.findIndex((x) => x.record.id === c.record.id);
    const semanticRank = valid.findIndex((x) => x.id === c.record.id);
    c.fusion =
      (lexicalRank < 0 ? 0 : policy.lexicalWeight / (61 + lexicalRank)) +
      (semanticRank < 0 ? 0 : (1 - policy.lexicalWeight) / (61 + semanticRank));
    // A candidate already present lexically may also clear the semantic gate.
    if (
      !lexicalAccepted &&
      c.record.id === valid[0]?.id &&
      semanticAccepted &&
      (!c.record.risk || c.record.risk === "low") &&
      !request.entities.some((e) => e.kind === "error")
    ) {
      const eligible =
        !c.record.platforms?.length && !c.record.browsers?.length;
      if (
        eligible &&
        assessAnswerability(input, c.record).status === "direct"
      ) {
        c.semanticAccepted = true;
        c.discovery = false;
      }
    }
  }
  // Acceptance is a separate decision from rank fusion. Preserve a reliable
  // lexical decision; otherwise a calibrated semantic decision can lead.
  const accepted = lexicalAccepted
    ? candidates[0]
    : candidates.find((c) => c.semanticAccepted);
  return candidates.sort((a, b) =>
    a === accepted
      ? -1
      : b === accepted
        ? 1
        : (b.fusion ?? 0) - (a.fusion ?? 0) || b.score - a.score,
  );
}
