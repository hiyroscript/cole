export const SEMANTIC_MODEL = "Xenova/all-MiniLM-L6-v2";
export const SEMANTIC_REVISION = "751bff37182d3f1213fa05d7196b954e230abad9";
export const SEMANTIC_WEIGHT_BYTES = 22972370;
export const SEMANTIC_WEIGHT_SHA256 =
  "afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1";
export const DIMENSIONS = 384;
export const SEMANTIC_CACHE = "gamma-semantic-v1";
export const KNOWLEDGE_VERSION = "gamma-3.0-2026-10-25";
export type SemanticIndex = {
  version: 1;
  model: string;
  revision: string;
  fingerprint: string;
  ids: string[];
  vectors: number[][];
  texts?: string[];
};
export function validIndex(
  value: unknown,
  ids: string[],
  fingerprint: string,
): value is SemanticIndex {
  const x = value as SemanticIndex;
  return (
    !!x &&
    x.version === 1 &&
    x.model === SEMANTIC_MODEL &&
    x.revision === SEMANTIC_REVISION &&
    x.fingerprint === fingerprint &&
    Array.isArray(x.ids) &&
    x.ids.length === ids.length &&
    x.ids.every((id, i) => id === ids[i]) &&
    (x.texts === undefined ||
      (Array.isArray(x.texts) &&
        x.texts.length === ids.length &&
        x.texts.every((t) => typeof t === "string" && t.length <= 20000))) &&
    Array.isArray(x.vectors) &&
    x.vectors.length === ids.length &&
    x.vectors.every(
      (v) =>
        Array.isArray(v) &&
        v.length === DIMENSIONS &&
        v.every(Number.isFinite) &&
        Math.abs(v.reduce((s, n) => s + n * n, 0) - 1) < 0.02,
    )
  );
}

export function reusableVectors(
  value: unknown,
): Map<string, { text: string; vector: number[] }> {
  const candidate = value as SemanticIndex;
  if (
    !candidate ||
    !Array.isArray(candidate.ids) ||
    typeof candidate.fingerprint !== "string" ||
    !validIndex(candidate, candidate.ids, candidate.fingerprint) ||
    !candidate.texts
  )
    return new Map();
  return new Map(
    candidate.ids.map((id, i) => [
      id,
      { text: candidate.texts![i], vector: candidate.vectors[i] },
    ]),
  );
}
