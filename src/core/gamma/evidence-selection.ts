import { assessAnswerability } from "./answerability";
import { understand } from "./language";
import type { Candidate } from "./retrieval";

// A distinct acceptance route for fully covered authored evidence. Neither a
// rank utility nor semantic cosine is increased to simulate confidence.
export function validateCandidates(
  input: string,
  candidates: Candidate[],
): Candidate[] {
  if (candidates[0]?.score === 1) return candidates;
  const request = understand(input);
  if (request.dangerous || request.excluded.length) return candidates;
  const validated = candidates.map((candidate) => ({
    ...candidate,
    support: assessAnswerability(input, candidate.record),
  }));
  // Preserve established lexical decisions. Promote only an unambiguous
  // independently supported candidate when the original route cannot answer.
  const first = candidates[0];
  const lexicalAccepted =
    first &&
    !validated[0].support.blocking &&
    !first.discovery &&
    first.score >= 0.63 &&
    !(
      candidates[1] &&
      first.score < 0.9 &&
      first.score - candidates[1].score < 0.055
    );
  if (lexicalAccepted) return validated;
  const direct = validated.filter(
    (c) =>
      c.support.status === "direct" &&
      (!c.record.risk || c.record.risk === "low"),
  );
  if (direct.length !== 1) return validated;
  const selected = direct[0];
  return [
    { ...selected, discovery: false, evidenceAccepted: true },
    ...validated.filter((c) => c !== selected),
  ];
}
