import { retrieve, webQuery } from "../madon/retrieval";
import type { Context, Response } from "../types";
export async function webResponse(
  input: string,
  context: Context,
  enabled: boolean,
  signal: AbortSignal,
): Promise<Response | undefined> {
  if (!/^(?:please )?(?:search|look up|lookup)\b/i.test(input.trim())) return;
  const query = webQuery(input.replace(/search wikipedia for/i, "search for"));
  if (!enabled)
    return {
      text: "Web retrieval is off. Gamma’s bundled knowledge works offline. Use /web on to allow a public topic query to Wikimedia; conversation history is not sent.",
      context,
    };
  if (!query)
    return {
      text: "Use a short public topic, without personal information, URLs, device details, or credentials.",
      context,
    };
  try {
    const sources = await retrieve(query, signal);
    signal.throwIfAborted();
    context.sources = sources;
    // Escaping makes extracts literal data, including Markdown-looking instructions.
    const literal = (s: string) =>
      s.replace(/[\\`*_{}\[\]()<>#+.!|~-]/g, "\\$&");
    return {
      text: sources.length
        ? "Public reference extracts from Wikipedia (not independently verified):\n\n" +
          sources
            .map(
              (s, i) =>
                `### Source ${i + 1}: ${literal(s.title)}\n${literal(s.text)}`,
            )
            .join("\n\n")
        : "No public reference results were found. Live information is unavailable.",
      sources,
      context,
    };
  } catch {
    signal.throwIfAborted();
    context.sources = [];
    return {
      text: "Live information was unavailable. The request may have failed because of connectivity, a timeout, or a provider restriction. You can still ask Gamma for bundled offline guidance.",
      context,
    };
  }
}
