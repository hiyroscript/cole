import { validateCandidates } from "./evidence-selection";
import { evidenceTerms } from "./evidence-terms";
import type { Answerability } from "./answerability";
import { rewriteQuery } from "./query";
import { knowledge } from "../../data/knowledge";
import { normalize, tokens, distance } from "../text";
import { understand, entities } from "./language";
export { normalize } from "../text";
const makeDocuments = () =>
  knowledge.map((record) => {
    const terms = tokens(
      record.title +
        " " +
        record.phrases.join(" ") +
        " " +
        record.keywords.join(" "),
    );
    const frequencies = new Map<string, number>();
    for (const term of terms)
      frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    return {
      record,
      answerTerms: new Set(tokens(record.answer)),
      evidenceTerms: new Set(evidenceTerms(`${record.title} ${record.answer}`)),
      terms,
      frequencies,
      entities: entities(record.title + " " + record.phrases.join(" ")).map(
        (e) => e.value,
      ),
      phrases: [record.title, ...record.phrases].map((p) => ({
        text: normalize(p),
        terms: tokens(p),
      })),
    };
  });
let documents = makeDocuments();
const inverted = new Map<string, Set<number>>();
const exact = new Map<string, number>();
const evidenceIndex = new Map<string, Set<number>>();
let average = 0;
let signature = "";
function refreshIndex() {
  const next = knowledge.map((k) => k.id).join("|");
  if (next === signature) return;
  signature = next;
  documents = makeDocuments();
  inverted.clear();
  exact.clear();
  evidenceIndex.clear();
  average =
    documents.reduce((s, d) => s + d.terms.length, 0) /
    Math.max(1, documents.length);
  for (const [i, doc] of documents.entries()) {
    for (const term of doc.frequencies.keys()) {
      if (!inverted.has(term)) inverted.set(term, new Set());
      inverted.get(term)!.add(i);
    }
    for (const p of doc.phrases) if (!exact.has(p.text)) exact.set(p.text, i);
    for (const term of doc.evidenceTerms) {
      if (!evidenceIndex.has(term)) evidenceIndex.set(term, new Set());
      evidenceIndex.get(term)!.add(i);
    }
  }
}
refreshIndex();
export type Candidate = {
  record: (typeof knowledge)[number];
  score: number;
  lexical: number;
  coverage: number;
  discovery?: boolean;
  semanticAccepted?: boolean;
  evidenceAccepted?: boolean;
  support?: Answerability;
  fusion?: number;
};
export function rank(input: string): Candidate[] {
  refreshIndex();
  const request = understand(rewriteQuery(input));
  if (
    request.excluded.length &&
    !tokens(request.positive).some(
      (t) => inverted.has(t) && !["browser", "issue"].includes(t),
    )
  )
    return [];
  if (/\b(chrome|firefox|safari|edge|brave) works but/.test(request.normalized))
    return [];
  const exactId =
    exact.get(normalize(input)) ??
    exact.get(request.normalized) ??
    exact.get(normalize(request.positive));
  if (exactId !== undefined && !request.excluded.length)
    return [
      { record: documents[exactId].record, score: 1, lexical: 1, coverage: 1 },
    ];
  const query = [...new Set(tokens(request.positive))].map((t) =>
    inverted.has(t) || t.length < 5
      ? t
      : ([...inverted.keys()].find(
          (k) => k.length >= 5 && distance(k, t) === 1,
        ) ?? t),
  );
  const candidates = new Set<number>();
  const evidenceHits = new Set<string>();
  const canonical = evidenceTerms(request.positive);
  const canonicalHits = new Map<number, number>();
  for (const term of canonical)
    evidenceIndex
      .get(term)
      ?.forEach((i) => canonicalHits.set(i, (canonicalHits.get(i) ?? 0) + 1));
  // Morphology-aware evidence discovery is independent of alias rank. It
  // never raises the lexical utility; passage validation decides acceptance.
  const evidenceCandidates = [...canonicalHits]
    .filter(([, hits]) => canonical.length >= 2 && hits >= 2)
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 12)
    .map(([i]) => i);
  for (const i of evidenceCandidates) {
    candidates.add(i);
    evidenceHits.add(documents[i].record.id);
  }
  for (const t of query) inverted.get(t)?.forEach((i) => candidates.add(i));
  // A second retrieval strategy finds explanatory evidence absent from aliases.
  // Discovery-only results cannot bypass the independent acceptance decision.
  for (const [i, d] of documents.entries())
    if (
      query.length >= 2 &&
      query.filter((t) => d.answerTerms.has(t)).length >= 2
    ) {
      candidates.add(i);
      evidenceHits.add(d.record.id);
    }
  const blocked = new Set(
    request.excluded.flatMap((s) =>
      /slow|sluggish/.test(s)
        ? ["slow", "load"]
        : /crash/.test(s)
          ? ["crash"]
          : ["wifi", "offline-network"],
    ),
  );
  const ranked = [...candidates]
    .filter((i) => !blocked.has(documents[i].record.id))
    .map((i) => {
      const d = documents[i];
      let bm25 = 0;
      for (const t of query) {
        const frequency = d.frequencies.get(t) ?? 0;
        const idf = Math.log(
          1 +
            (documents.length - (inverted.get(t)?.size ?? 0) + 0.5) /
              ((inverted.get(t)?.size ?? 0) + 0.5),
        );
        bm25 +=
          (idf * frequency * 2.2) /
          (frequency + 1.2 * (0.25 + (0.75 * d.terms.length) / average));
      }
      let coverage = 0,
        phrase = 0;
      for (const p of d.phrases) {
        const hits = query.filter((t) => p.terms.includes(t)).length;
        coverage = Math.max(
          coverage,
          (0.65 * hits) / Math.max(1, query.length) +
            (0.35 * hits) / Math.max(1, p.terms.length),
        );
        if (p.terms.length >= 2 && p.terms.every((t) => query.includes(t)))
          phrase = Math.max(phrase, 0.13);
        if (p.terms.length >= 2 && normalize(request.positive).includes(p.text))
          phrase = 0.16;
      }
      const entity = request.entities.some((e) => d.entities.includes(e.value))
        ? 0.04
        : 0;
      // Bounded rank utility, not a probability. Exact and dangerous requests need separate treatment.
      const lexical = bm25 / (bm25 + 8);
      const score = Math.min(
        0.99,
        coverage * 0.82 + lexical * 0.12 + phrase + entity,
      );
      return {
        record: d.record,
        score:
          request.dangerous && coverage < 0.85 ? Math.min(score, 0.5) : score,
        lexical,
        coverage,
      };
    })
    .filter((c) => c.score >= 0.5 || evidenceHits.has(c.record.id))
    .map((c) => ({ ...c, discovery: c.score < 0.5 }))
    .sort(
      (a, b) =>
        Number(!!a.discovery) - Number(!!b.discovery) || b.score - a.score,
    )
    .slice(0, 24);
  for (const i of evidenceCandidates) {
    const record = documents[i].record;
    if (
      !blocked.has(record.id) &&
      !ranked.some((c) => c.record.id === record.id)
    )
      ranked.push({
        record,
        score: 0,
        lexical: 0,
        coverage: 0,
        discovery: true,
      });
  }
  return validateCandidates(input, ranked);
}
export function confidence(candidates: Candidate[]) {
  const first = candidates[0];
  if (first?.support?.blocking) return "unsupported";
  if (first?.semanticAccepted || first?.evidenceAccepted) return "moderate";
  if (!first || first.discovery || first.score < 0.63) return "unsupported";
  if (
    candidates[1] &&
    first.score < 0.9 &&
    first.score - candidates[1].score < 0.055
  )
    return "ambiguous";
  return first.score >= 0.85 ? "high" : "moderate";
}
export const indexStats = () => ({
  records: documents.length,
  terms: inverted.size,
});
