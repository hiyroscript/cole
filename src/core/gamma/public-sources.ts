import { retrieve } from "../madon/retrieval";
import { validSource, type Source } from "../madon/sources";
export type PublicResult = {
  sources: Source[];
  retrievedAt: string;
  cached: boolean;
  provider: string;
};
export type PublicProvider = {
  id: string;
  fetch: (topic: string, signal: AbortSignal) => Promise<Source[]>;
};
export const providers: readonly PublicProvider[] = [
  { id: "wikimedia", fetch: retrieve },
];
const CACHE = "gamma-public-v1";
const cacheKey = (query: string) =>
  new URL(
    "gamma-public/" + encodeURIComponent(query.toLowerCase()),
    typeof location === "undefined"
      ? "https://local.invalid/"
      : location.origin + "/",
  ).href;
function valid(value: unknown): value is PublicResult {
  const x = value as PublicResult;
  return (
    !!x &&
    Array.isArray(x.sources) &&
    x.sources.length <= 2 &&
    x.sources.every(validSource) &&
    typeof x.retrievedAt === "string" &&
    Number.isFinite(Date.parse(x.retrievedAt)) &&
    x.provider === "wikimedia"
  );
}
export async function lookupPublic(
  query: string,
  signal: AbortSignal,
): Promise<PublicResult> {
  signal.throwIfAborted();
  const provider = providers[0];
  try {
    const sources = await provider.fetch(query, signal);
    signal.throwIfAborted();
    const result = {
      sources,
      retrievedAt: new Date().toISOString(),
      cached: false,
      provider: provider.id,
    };
    if (sources.length && typeof caches !== "undefined")
      try {
        const cache = await caches.open(CACHE);
        await cache.put(cacheKey(query), new Response(JSON.stringify(result)));
        const keys = await cache.keys();
        for (const old of keys.slice(0, Math.max(0, keys.length - 20)))
          await cache.delete(old);
      } catch {
        /* storage failure never changes a verified fetch into a failure */
      }
    return result;
  } catch (error) {
    signal.throwIfAborted();
    if (typeof caches !== "undefined")
      try {
        const cached = await (await caches.open(CACHE)).match(cacheKey(query));
        const value: unknown = cached ? await cached.json() : null;
        if (valid(value)) return { ...value, cached: true };
      } catch {
        /* malformed or evicted cache */
      }
    throw error;
  }
}
export async function clearPublicCache() {
  if (typeof caches !== "undefined") await caches.delete(CACHE);
  return "Cached public reference material cleared. Saved conversation excerpts are unchanged.";
}
export function sourceSynthesis(result: PublicResult, query: string) {
  const literal = (s: string) => s.replace(/[\\`*_{}\[\]()<>#+.!|~-]/g, "\\$&");
  const terms = new Set(
    query
      .toLowerCase()
      .split(/\W+/)
      .filter((s) => s.length > 2),
  );
  return (
    `${result.cached ? "Cached" : "Newly retrieved"} public reference extracts from Wikipedia (not independently verified). Retrieved ${result.retrievedAt}. ${result.cached ? "The live lookup failed; cached material may be stale." : "Built-in knowledge is separate from this lookup."}\n\n` +
    result.sources
      .map((s, i) => {
        const sentences = s.text.split(/(?<=[.!?])\s+/).filter(Boolean);
        const selected = sentences
          .map((text, index) => ({
            text,
            index,
            score: text
              .toLowerCase()
              .split(/\W+/)
              .filter((w) => terms.has(w)).length,
          }))
          .sort((a, b) => b.score - a.score || a.index - b.index)
          .slice(0, 3)
          .sort((a, b) => a.index - b.index);
        return `### Source ${i + 1}: ${literal(s.title)}\nArticle revision: ${s.updatedAt ?? "not provided"}. Publication date: not provided. A revision date does not prove every statement is current.\n\n${selected.map((r) => literal(r.text)).join("\n\n")}\n\nAttribution: source ${i + 1}. This is a literal extract, not a generated conclusion.`;
      })
      .join("\n\n") +
    "\n\nThe sources are presented separately so claims remain attributable. Agreement and causation have not been established. Retrieval time records this lookup; article revision time records an edit, not publication or browser feature support. These extracts cannot establish what changed without comparable dated evidence."
  );
}
