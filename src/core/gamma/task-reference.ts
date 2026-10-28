import { followupFrame } from "./followup";
export type TaskReference = {
  kind: "subject" | "group" | "result";
  text: string;
  start: number;
  end: number;
};

// These are argument positions, not a search for pronouns anywhere in a
// sentence. Relative clauses ("a page that ..."), complementizers ("tell
// that somebody ...") and references within a new subject stay untouched.
export function taskReference(input: string): TaskReference | undefined {
  if (followupFrame(input))
    return { kind: "subject", text: input, start: 0, end: input.length };
  const prefix =
    /^(?:please\s+)?(?:(?:can|could|would) you\s+)?(?:please\s+)?/i.exec(
      input,
    )![0];
  const text = input.slice(prefix.length);
  const argument = "(it|that|this|them|they|each)";
  const patterns = [
    new RegExp(
      `^(?:compare|explain|describe|define|summarize|repeat)\\s+${argument}\\b`,
      "i",
    ),
    new RegExp(
      `^(?:tell me (?:more )?about|say more about)\\s+${argument}\\b`,
      "i",
    ),
    new RegExp(
      `^(?:(?:explain|describe)\\s+)?(?:what|how|why|where|when)\\s+(?:(?:does|do|is|are|can|could|would|should|will)\\s+)?${argument}\\b`,
      "i",
    ),
    new RegExp(
      `^(?:is|are|can|could|would|should|will)\\s+${argument}\\b`,
      "i",
    ),
    new RegExp(`^(?:which|what) of\\s+${argument}\\b`, "i"),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const pronoun = match[1];
    const end = prefix.length + match[0].length;
    // Demonstrative determiners already name a subject: "that API", for
    // example, is not permission to replace "that" with another task's title.
    const rest = input.slice(end);
    if (
      /^(?:that|this)$/i.test(pronoun) &&
      /^\s+(?:[a-z][\w-]*)(?:\s|[.!?]|$)/i.test(rest) &&
      !/^\s+(?:with|to|versus|vs|and|in|for|more|mean|means|do|does|is|are|can|could|would|should|will|relate|relates)\b/i.test(
        rest,
      )
    )
      continue;
    return {
      kind: /^(?:them|they|each)$/i.test(pronoun) ? "group" : "subject",
      text: pronoun,
      start: end - pronoun.length,
      end,
    };
  }
}

// Arithmetic references are operands in the constrained calculator grammar.
// The executor receives a typed value, never a number scraped from prose.
export function resultReference(input: string): TaskReference | undefined {
  const match =
    /\b(?:(?:the|that|this|previous)\s+)?result\b|\b(?:it|that)\b/i.exec(input);
  return match
    ? {
        kind: "result",
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
      }
    : undefined;
}

export function arithmeticReferences(input: string): string {
  return input.replace(
    /\b(?:(?:the|that|this|previous)\s+)?result\b|\b(?:it|that)\b/gi,
    "result",
  );
}
