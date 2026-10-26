// Only user request frames reach this router. Payloads never re-enter dispatch.
export type LocalToolRequest = { name: "calculate" | "analyze"; input: string };
export function naturalTool(input: string): LocalToolRequest | undefined {
  const text = input
    .trim()
    .replace(/^(?:please\s+)?(?:(?:can|could|would) you\s+)?/i, "");
  const explicit = text.match(
    /^(?:calculate|compute|work out|convert)\s+([\s\S]+)$/i,
  );
  if (explicit)
    return { name: "calculate", input: explicit[1].replace(/[?]$/, "") };
  const question = text.match(
    /^(?:what is|what's|how much is)\s+([\s\S]+?)[?]?$/i,
  );
  if (
    question &&
    /^[\d\s.+*/()%\-]+(?:\s+of\s+[+-]?[\d.]+)?$/.test(question[1])
  )
    return { name: "calculate", input: question[1] };
  const data = text.match(
    /^(?:analyze|validate|format|check)\s+(?:(?:this|the)\s+)?(?:json\s*(?::|below:)?\s*)?([\s\S]+)$/i,
  );
  if (data && (/^analyze\b/i.test(text) || /^[\[{]/.test(data[1])))
    return { name: "analyze", input: data[1] };
}
