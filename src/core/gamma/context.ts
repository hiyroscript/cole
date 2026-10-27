import { emptyContext, type Context } from "../types";
export function freshContext(previous: Context, now = Date.now()): Context {
  // Expire unresolved references, not user-provided facts or an active diagnosis.
  const c = structuredClone(previous);
  c.attempted = c.attempted.slice(-24);
  if (c.diagnosis) c.diagnosis.history = c.diagnosis.history.slice(-24);
  if (now - previous.updated > 30 * 60_000 || previous.turns >= 24) {
    const next = emptyContext();
    next.browser = c.browser;
    next.language = c.language;
    next.familiarity = c.familiarity;
    next.platform = c.platform;
    next.diagnosis = c.diagnosis;
    next.case = c.case;
    next.pausedCases = c.pausedCases;
    next.goal = c.goal;
    next.attempted = c.attempted;
    return next;
  }
  return c;
}
export function resolveReference(input: string, context: Context) {
  const browser = context.browser ?? context.detectedBrowser;
  if (
    /^(is it private|is that private|what about its privacy)[?.! ]*$/i.test(
      input,
    ) &&
    browser
  )
    return "what about privacy";
  if (/compare (?:it|that browser) with/i.test(input) && browser)
    return input.replace(/\b(it|that browser)\b/i, browser);
  return input;
}

// Ordinals refer only to the most recent explicit clarification choices.
// Selecting a topic never executes an action suggested by its explanation.
export function clarificationChoice(input: string, choices: string[]) {
  const match = input
    .trim()
    .match(
      /^(?:(?:I mean|tell me about|explain)\s+)?(?:the\s+)?(first|second|third|last|[1-3])(?:\s+(?:one|option|topic))?(?:,?\s+please)?[.!?]*$/i,
    );
  if (!match) return undefined;
  const value = match[1].toLowerCase();
  const index =
    value === "last"
      ? choices.length - 1
      : ["first", "second", "third"].includes(value)
        ? ["first", "second", "third"].indexOf(value)
        : Number(value) - 1;
  return choices[index] ?? null;
}
