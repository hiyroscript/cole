import type { Knowledge } from "../../core/types";
// Authored rows, never generated permutations. Sources identify reference material,
// not a claim of a live fetch. All content is deterministic local guidance.
export function records(
  domain: string,
  source: string,
  rows: string,
): Knowledge[] {
  return rows
    .trim()
    .split("\n")
    .map((line) => {
      const [id, title, aliases, answer, steps, related = ""] = line.split("|");
      return {
        id: `g3-${id}`,
        category: domain,
        title,
        phrases: aliases.split("~"),
        keywords: title.toLowerCase().split(/\W+/),
        answer,
        steps: steps.split("~"),
        followups: ["Show me the steps", "Explain the evidence"],
        related: related
          ? related
              .split(",")
              .map((id) => (id.startsWith("@") ? id.slice(1) : `g3-${id}`))
          : [],
        reference: source,
        reviewed: "2026-10-25",
        risk: "low",
      };
    });
}
