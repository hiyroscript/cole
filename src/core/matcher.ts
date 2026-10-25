import { knowledge } from "../data/knowledge";
import { normalize, tokens, distance } from "./text";
export { normalize, tokens, distance } from "./text";
const exact = new Map(
  knowledge.flatMap((k) =>
    [k.title, ...k.phrases].map((p) => [normalize(p), k.id] as const),
  ),
);
const index = new Map<string, Set<string>>();
for (const k of knowledge)
  for (const t of new Set(tokens(k.title + " " + k.phrases.join(" ")))) {
    if (!index.has(t)) index.set(t, new Set());
    index.get(t)!.add(k.id);
  }
export function rank(input: string) {
  const norm = normalize(input),
    query = tokens(input);
  const candidates = new Set<string>();
  const exactId = exact.get(norm);
  if (exactId) candidates.add(exactId);
  for (const t of query) {
    let hit = index.get(t);
    if (!hit && t.length >= 5) {
      const close = [...index.keys()].find(
        (k) => k.length >= 5 && distance(t, k) === 1,
      );
      if (close) hit = index.get(close);
    }
    hit?.forEach((id) => candidates.add(id));
  }
  return knowledge
    .filter((k) => candidates.has(k.id))
    .map((k) => {
      let score = 0;
      for (const phrase of [k.title, ...k.phrases]) {
        const p = normalize(phrase),
          pt = tokens(phrase);
        const hits = query.filter((q) =>
          pt.some(
            (t) =>
              q === t ||
              (q.length >= 5 && t.length >= 5 && distance(q, t) === 1),
          ),
        ).length;
        const precision = hits / Math.max(query.length, 1),
          recall = hits / Math.max(pt.length, 1);
        const overlap = 0.65 * precision + 0.35 * recall;
        score = Math.max(
          score,
          norm === p
            ? 1
            : norm.includes(p) && pt.length >= 2
              ? 0.96
              : overlap * 0.9,
        );
      }
      return { record: k, score };
    })
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score >= 0.56);
}
export const indexSize = () => index.size;
