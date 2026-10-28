import type { Depth } from "../types";

export function followupFrame(
  input: string,
): { kind: "repeat" } | { kind: "depth"; depth: Depth } | undefined {
  const text = input
    .trim()
    .replace(/[.?!]+$/, "")
    .trim()
    .replace(/^(?:please\s+)?(?:(?:can|could|would) you\s+)?/i, "");
  if (/^(repeat|say that again|repeat that)$/i.test(text))
    return { kind: "repeat" };
  if (
    /^(?:(?:make (?:it|that) )?(?:shorter|brief)|summarize (?:it|that))$/i.test(
      text,
    )
  )
    return { kind: "depth", depth: "brief" };
  if (
    /^(?:(?:give|show) me (?:the )?(?:steps|instructions)|step by step|what should i try first|how do i fix (?:that|it))$/i.test(
      text,
    )
  )
    return { kind: "depth", depth: "steps" };
  if (
    /^(?:more detail|explain (?:that|it) more(?: simply)?|what does that mean|tell me more about (?:it|that))$/i.test(
      text,
    )
  )
    return { kind: "depth", depth: "detailed" };
}
