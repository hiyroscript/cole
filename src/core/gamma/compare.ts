import { comparisonMatrix } from "./comparison";
import type { Context } from "../types";
import { rank, confidence } from "./retrieval";
// Structured juxtaposition, not generated conclusions or inferred causation.
export function compareKnowledge(input: string, context: Context): string {
  const table = /\btable\b/i.test(input);
  input = input.replace(/\s+(?:in|as) (?:a )?table[.!?]*$/i, "");
  const subjects = input
    .trim()
    .split(/\s+(?:with|versus|vs\.?|to|and)\s+|,\s*(?:and\s+)?|\s*\|\s*/i);
  if (
    subjects.length < 2 ||
    subjects.length > 4 ||
    subjects.some((s) => !s || s.length > 200)
  )
    return "Use /compare subject | subject, for example /compare WebGPU | WebGL.";
  const selections = subjects.map((subject) =>
    rank(
      /^(?:ram|memory)$/i.test(subject.trim()) ? "RAM versus storage" : subject,
    ),
  );
  if (
    selections.some(
      (results) => !["high", "moderate"].includes(confidence(results)),
    )
  )
    return "I need two clearly supported subjects for a sourced comparison. Try /compare WebGPU | WebGL.";
  const records = selections.map((results) => results[0].record);
  if (new Set(records.map((k) => k.id)).size !== records.length)
    return "Both subjects matched the same guidance. Please name two distinct features.";
  const platform = context.platform
    ?.replace(/windows.*/, "windows")
    .replace("ubuntu", "linux");
  if (
    platform &&
    records.some(
      (k) =>
        k.platforms?.length &&
        !k.platforms.some((p) => p.toLowerCase() === platform),
    )
  )
    return `One subject has instructions for a different operating system than your stated ${platform}. Please specify whether you want a cross-platform comparison.`;
  context.authoredSources = records.map((k) => k.id);
  context.comparison = records.map((k) => k.id);
  context.sources = undefined;
  if (table) {
    const cell = (text: string) =>
      text.replace(/\|/g, "\\|").replace(/\n/g, " ");
    return (
      "Comparison from authored guidance; references were not checked live.\n\n| Subject | Explanation | Applicability and safety | Reference |\n| --- | --- | --- | --- |\n" +
      records
        .map(
          (k) =>
            `| ${cell(k.title)} | ${cell(k.answer)} | ${cell(k.safety ?? k.platforms?.join(", ") ?? "Check feature availability in your environment.")} | [Source](${k.reference}), reviewed ${k.reviewed} |`,
        )
        .join("\n")
    );
  }
  return (
    "Comparison from built-in authored guidance; references were not checked live.\n\n" +
    records
      .map(
        (k) =>
          `### ${k.title}\n${k.answer}\n\n${k.safety ? `Safety: ${k.safety}\n\n` : ""}${context.depth === "steps" || context.depth === "detailed" ? k.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") + "\n\n" : ""}Reference: [${k.title}](${k.reference}). Reviewed ${k.reviewed}.`,
      )
      .join("\n\n") +
    comparisonMatrix(records.map((k) => k.id))
  );
}
