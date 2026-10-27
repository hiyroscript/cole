import { questionFrame } from "./question";

// Query rewrites preserve the original request for independent answer validation.
// This vocabulary expands abbreviations, not aliases for evaluation questions.
export function rewriteQuery(input: string): string {
  let text =
    questionFrame(input)?.subject ?? input.trim().replace(/[?.!]$/, "");
  text = text.replace(
    /^(?:please\s+)?(?:(?:can|could|would) you\s+)?(?:help me\s+)?(?:explain|describe|define|tell me about|give me (?:an? )?(?:overview|explanation) of)\s+/i,
    "",
  );
  text = text.replace(/^what (?:is|are) (?:an? |the )?/i, "");
  text = text.replace(/^what does (.+?) (?:mean|stand for)$/i, "$1");
  text = text.replace(
    /\s+(?:in (?:plain|simple) (?:english|terms)|without jargon|for (?:a )?beginner)$/i,
    "",
  );
  text = text.replace(
    /\b(?:HTTP\s+status|status(?:\s+code)?|error\s+code)\s+([45]\d\d)\b/gi,
    "HTTP $1",
  );
  const concepts: [RegExp, string][] = [
    [/\bcentral processing unit\b/gi, "CPU"],
    [/\bgraphics processing unit\b/gi, "GPU"],
    [/\brandom access memory\b/gi, "RAM"],
    [/\bdomain name system\b/gi, "DNS"],
    [/\bwasm\b/gi, "WebAssembly"],
    [/\bsolid state drive\b/gi, "SSD"],
  ];
  for (const [pattern, value] of concepts) text = text.replace(pattern, value);
  return text;
}
