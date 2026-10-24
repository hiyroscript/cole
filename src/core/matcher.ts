import { knowledge } from "../data/knowledge";
export const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const stop = new Set(
  "a an the my i me you your is are am do does can could would please to of in on for how what which why it this that with have using tell about".split(
    " ",
  ),
);
const synonyms: Record<string, string> = {
  browsr: "browser",
  broswer: "browser",
  laggy: "slow",
  lagging: "slow",
  sluggish: "slow",
  speed: "performance",
  faster: "slow",
  ram: "memory",
  crashing: "crash",
  freezing: "frozen",
  internet: "network",
  wifi: "wifi",
  private: "privacy",
  secure: "security",
  safety: "security",
};
export const tokens = (text: string) =>
  normalize(text)
    .split(" ")
    .filter((t) => t && !stop.has(t))
    .map((t) => synonyms[t] ?? t);
export function distance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        row[j] + 1,
        row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    row = next;
  }
  return row[b.length];
}
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
