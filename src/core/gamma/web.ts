import { lookupPublic, sourceSynthesis } from "./public-sources";
import { webQuery } from "../madon/retrieval";
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
      text: "Web retrieval is off. Gamma’s bundled knowledge works offline. Use /web on to allow public topic queries to Wikimedia, or explicitly request /research mdn webgpu for MDN compatibility data via GitHub. Conversation history is not sent.",
      context,
    };
  if (!query)
    return {
      text: "Use a short public topic, without personal information, URLs, device details, or credentials.",
      context,
    };
  try {
    const result = await lookupPublic(query, signal);
    const sources = result.sources;
    signal.throwIfAborted();
    context.sources = sources;
    context.authoredSources = undefined;
    return {
      text: sources.length
        ? sourceSynthesis(result, query)
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
