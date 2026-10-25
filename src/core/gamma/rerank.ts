import type { Candidate } from "./retrieval";
import { understand, entities } from "./language";
import { knowledge } from "../../data/knowledge";
const records = new Map(knowledge.map((k) => [k.id, k]));
// Reciprocal ranks order discovery candidates; cosine similarity is never an
// answer confidence. Semantic-only discovery requires explicit clarification
// until independent acceptance calibration is available.
export function rerank(
  input: string,
  lexical: Candidate[],
  scores: { id: string; score: number }[],
): Candidate[] {
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
  // Provisional discovery floor and separation, not an automatic-answer gate.
  // A tie or weak neighborhood gives no new suggestion at all.
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
        discovery: true,
        fusion: 1 / (60 + rank + 1),
      });
    }
  }
  return candidates.sort(
    (a, b) => b.score - a.score || (b.fusion ?? 0) - (a.fusion ?? 0),
  );
}
