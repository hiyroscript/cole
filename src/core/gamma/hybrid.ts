import { rerank } from "./rerank";
import { rank, type Candidate } from "./retrieval";
import { understand } from "./language";
import { semantic } from "./semantic";
export async function retrieveCandidates(
  input: string,
  enhanced: boolean,
  signal?: AbortSignal,
): Promise<Candidate[]> {
  const lexical = rank(input),
    request = understand(input);
  if (
    !enhanced ||
    lexical[0]?.score === 1 ||
    request.dangerous ||
    request.excluded.length
  )
    return lexical;
  try {
    const scores = await semantic.query(input, signal);
    signal?.throwIfAborted();
    return rerank(input, lexical, scores);
  } catch {
    signal?.throwIfAborted();
    return lexical;
  }
}
