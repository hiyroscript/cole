import { checkCapabilities } from "./capabilities";
import { rank } from "../matcher";
import type { Context, Evidence, Response } from "../types";
import type { RunOptions } from "../models";
import { madon } from "./runtime";
import { buildPrompt, diagnosticRequest, thinkingEnabled } from "./prompt";
import { retrieve, webQuery } from "./retrieval";
import type { Source } from "./sources";
export async function generate(
  input: string,
  context: Context,
  options: RunOptions,
): Promise<Response> {
  let facts: Evidence[] = [],
    sources: Source[] = [];
  const analysis: string[] = [];
  if (diagnosticRequest(input)) {
    options.stage?.("Reviewing browser information");
    facts = await options.facts();
    const groups = /screen|resolution/i.test(input)
      ? ["Display"]
      : /storage/i.test(input)
        ? ["Storage"]
        : /operating system/i.test(input)
          ? ["Device"]
          : /what browser|which browser/i.test(input)
            ? ["Browser"]
            : null;
    if (groups) facts = facts.filter((f) => groups.includes(f.group));
    if (/webgpu|run madon|acceleration/i.test(input)) {
      const capability = await checkCapabilities();
      facts.push({
        group: "Browser",
        kind: "Observed",
        label: "Madon compatibility check",
        value: capability.detail,
      });
      facts.push({
        group: "Browser",
        kind: "Observed",
        label: "Madon runtime state",
        value: madon.getSnapshot().state,
      });
    }
    analysis.push(
      "Read available browser signals. Estimates and unavailable values retain their evidence labels.",
    );
  }
  const query = options.webSources ? webQuery(input) : null;
  if (query) {
    options.stage?.("Retrieving Wikimedia sources");
    try {
      sources = await retrieve(query, options.signal);
      analysis.push(
        sources.length
          ? "Retrieved public Wikimedia reference material. This is limited factual lookup, not unrestricted browsing."
          : "No web sources were found. Live verification was unavailable.",
      );
    } catch {
      if (options.signal.aborted)
        throw new DOMException("Stopped", "AbortError");
      analysis.push(
        "Web retrieval failed. Live verification was unavailable; this answer uses local model knowledge.",
      );
    }
  }
  options.signal.throwIfAborted();
  const thinking = thinkingEnabled(options.thinking, input);
  const request = buildPrompt(
    input +
      (query && !sources.length
        ? "\n[Web retrieval was unavailable. Do not claim live verification.]"
        : ""),
    options.history,
    thinking,
    facts,
    sources,
    options.device,
    sources.length || facts.length
      ? ""
      : (rank(input).find((r) => r.score >= 0.9)?.record.answer ?? ""),
  );
  if (request.omitted)
    analysis.push(
      "Older turns were omitted to fit the 4,096-token context. Start a new conversation to reset context.",
    );
  options.stage?.(thinking ? "Analyzing the request" : "Preparing an answer");
  const text = await madon.generate(request, options.signal, options.onText);
  return {
    text,
    context,
    evidence: facts.length ? facts : undefined,
    sources,
    analysis: analysis.length ? analysis : undefined,
  };
}
