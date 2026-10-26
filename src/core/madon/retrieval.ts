import { validSource, type Source } from "./sources";
export function webQuery(input: string): string | null {
  // Never transmit diagnostics, page excerpts, URLs, addresses, or a conversation history.
  if (
    /https?:|@|\b(my|our|password|token|secret|device|browser|screen|storage|I am|I'm)\b/i.test(
      input,
    )
  )
    return null;
  if (
    !/\b(look up|search|what is|what are|who is|when|latest|current|tell me about)\b/i.test(
      input,
    )
  )
    return null;
  return (
    input
      .replace(
        /^(?:please\s+)?(?:look up|search for|search|what is|what are|tell me about)\s+/i,
        "",
      )
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .slice(0, 120) || null
  );
}
export function parseSources(data: unknown): Source[] {
  const pages = (data as { query?: { pages?: unknown } })?.query?.pages;
  if (!Array.isArray(pages)) throw new Error("Invalid Wikimedia response");
  return pages.slice(0, 2).flatMap((p) => {
    if (!p || typeof p !== "object") return [];
    const x = p as Record<string, unknown>;
    if (typeof x.title !== "string" || typeof x.extract !== "string") return [];
    const revision = Array.isArray(x.revisions)
      ? x.revisions[0]?.timestamp
      : undefined;
    const source = {
      title: x.title,
      ...(typeof revision === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(revision) &&
      Number.isFinite(Date.parse(revision))
        ? { updatedAt: revision }
        : {}),
      text: x.extract.slice(0, 1400),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(x.title.replaceAll(" ", "_"))}`,
    };
    return validSource(source) && source.text ? [source] : [];
  });
}
export async function retrieve(
  query: string,
  signal: AbortSignal,
): Promise<Source[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    generator: "search",
    gsrsearch: query.slice(0, 120),
    gsrnamespace: "0",
    gsrlimit: "2",
    prop: "extracts|revisions",
    rvprop: "timestamp",
    exintro: "1",
    explaintext: "1",
    exchars: "1400",
  });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok)
    throw new Error(`Wikimedia unavailable (${response.status})`);
  const text = await response.text();
  if (text.length > 100_000) throw new Error("Wikimedia response too large");
  return parseSources(JSON.parse(text));
}
