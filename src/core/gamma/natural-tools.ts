import { arithmeticReferences } from "./task-reference";
// Only user request frames reach this router. Payloads never re-enter dispatch.
export type LocalToolRequest = {
  name: "calculate" | "analyze" | "stats" | "csv" | "text" | "diff" | "logic";
  input: string;
};
export function naturalTool(input: string): LocalToolRequest | undefined {
  const text = input
    .trim()
    .replace(/^(?:please\s+)?(?:(?:can|could|would) you\s+)?/i, "");
  const stats = text.match(
    /^(?:(?:what is|find|calculate) (?:the )?(?:mean|average|median|standard deviation) (?:of|for)|statistics(?: for)?)[ :]+([\s\S]+?)[?]?$/i,
  );
  if (stats) return { name: "stats", input: stats[1] };
  const csv = text.match(
    /^(?:analyze|summarize|check) (?:this )?CSV\s*:\s*([\s\S]+)$/i,
  );
  if (csv) return { name: "csv", input: csv[1] };
  const count = text.match(
    /^(?:count (?:the )?(?:words|characters|lines)(?: in)?|analyze text)\s*:\s*([\s\S]+)$/i,
  );
  if (count) return { name: "text", input: count[1] };
  const diff = text.match(/^compare texts\s*:\s*([\s\S]+)$/i);
  if (diff) return { name: "diff", input: diff[1] };
  const logic = text.match(/^deduce\s*:\s*([\s\S]+)$/i);
  if (logic) return { name: "logic", input: logic[1] };
  const explicit = text.match(
    /^(?:calculate|compute|work out|convert)\s+([\s\S]+)$/i,
  );
  if (explicit)
    return {
      name: "calculate",
      input: arithmeticReferences(explicit[1].replace(/[?.!]$/, "")),
    };
  const arithmetic = text
    .replace(/[?.!]$/, "")
    .match(/^(add|subtract|multiply|divide)\s+(.+?)\s+(to|from|by)\s+(.+)$/i);
  if (arithmetic) {
    const [, operation, left, preposition, right] = arithmetic;
    const op = operation.toLowerCase();
    const expected = {
      add: "to",
      subtract: "from",
      multiply: "by",
      divide: "by",
    }[op];
    if (preposition.toLowerCase() === expected) {
      const [a, b] = op === "subtract" ? [right, left] : [left, right];
      const symbol = { add: "+", subtract: "-", multiply: "*", divide: "/" }[
        op
      ];
      return {
        name: "calculate",
        input: arithmeticReferences(`(${a}) ${symbol} (${b})`),
      };
    }
  }
  const question = text.match(
    /^(?:what is|what's|how much is)\s+([\s\S]+?)[?]?$/i,
  );
  if (
    question &&
    /^[\d\s.+*/()%\-]+(?:\s+of\s+[+-]?[\d.]+)?$/.test(question[1])
  )
    return { name: "calculate", input: question[1] };
  // An explicit document frame uses selected files; every other analysis
  // payload stays data, even when it contains document-looking instructions.
  if (
    /^analyze (?:the |this |my |these )?(?:documents?|files?|reports?)\b/i.test(
      text,
    )
  )
    return;
  const data = text.match(
    /^(?:analyze|validate|format|check)\s+(?:(?:this|the)\s+)?(?:json\s*(?::|below:)?\s*)?([\s\S]+)$/i,
  );
  if (data && (/^analyze\b/i.test(text) || /^[\[{]/.test(data[1])))
    return { name: "analyze", input: data[1] };
}
