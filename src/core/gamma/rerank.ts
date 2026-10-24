import type { Candidate } from "./retrieval";
import { understand } from "./language";
// Pure and shared by production and the real-model benchmark. The similarity
// score is a ranking signal, never a probability or permission to execute tools.
export function rerank(
  input: string,
  lexical: Candidate[],
  scores: { id: string; score: number }[],
): Candidate[] {
  const request = understand(input);
  if (lexical[0]?.score === 1 || request.dangerous || request.excluded.length)
    return lexical;
  return lexical
    .map((c) => {
      const similarity = scores.find((s) => s.id === c.record.id)?.score ?? 0;
      return {
        ...c,
        score:
          c.record.risk && c.record.risk !== "low"
            ? c.score
            : Math.min(
                0.99,
                c.score + (similarity >= 0.65 && c.coverage >= 0.5 ? 0.06 : 0),
              ),
      };
    })
    .sort((a, b) => b.score - a.score);
}
