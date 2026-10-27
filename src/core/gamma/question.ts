export type QuestionFrame = {
  kind: "definition" | "purpose" | "description";
  subject: string;
  style?: "plain" | "brief";
};

// Parse only whole educational constructions. Clauses, conditions and unknown
// modifiers remain inside the subject, so they cannot disappear at acceptance.
// A frame describes the requested answer, not a claim that evidence exists.
export function questionFrame(input: string): QuestionFrame | undefined {
  let text = input
    .trim()
    .replace(/[?.!]$/, "")
    .trim();
  let style: QuestionFrame["style"];
  const plain =
    /,?\s+(?:in (?:plain|simple|everyday) (?:english|language|terms)|for (?:a )?beginner|without (?:jargon|assuming (?:technical expertise|I am a specialist)))$/i;
  if (plain.test(text)) {
    style = "plain";
    text = text.replace(plain, "");
  }
  text = text.replace(
    /^(?:please\s+)?(?:(?:can|could|would) you\s+)?(?:please\s+)?/i,
    "",
  );
  text = text.replace(/^tell me (?=what\b)/i, "");
  const patterns: [QuestionFrame["kind"], RegExp][] = [
    ["definition", /^(?:explain\s+)?what (.+?) (?:is|are)$/i],
    ["definition", /^what (.+?) means$/i],
    ["definition", /^what (?:does|do) (.+?) (?:mean|stand for|signify)$/i],
    [
      "purpose",
      /^(?:what is|explain) (?:the )?(?:purpose|role|function) of (.+)$/i,
    ],
    ["purpose", /^what (?:is|are) (.+?) (?:used for|for)$/i],
    ["purpose", /^what (?:does|do) (.+?) (?:do|provide|offer)$/i],
    ["definition", /^what (?:is|are) (.+)$/i],
    [
      "description",
      /^(?:briefly\s+)?(?:explain|describe|define|tell me about)\s+(.+)$/i,
    ],
    [
      "description",
      /^give me (?:an? )?(?:(brief|short) )?(?:overview|explanation|description) of (.+)$/i,
    ],
  ];
  for (const [kind, pattern] of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    if (match[1] === "brief" || match[1] === "short") style ??= "brief";
    const subject = (match[2] ?? match[1])
      .replace(/^(?:an?|the)\s+/i, "")
      .trim();
    if (subject) return { kind, subject, style };
  }
}
