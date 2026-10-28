// Mark user-authored top-level text in one bounded pass. Quoted examples and
// bracketed payloads cannot turn a conjunction into a dispatch boundary.
export function topLevelText(input: string): Uint8Array {
  const output = new Uint8Array(input.length);
  const stack: string[] = [];
  let quote = "",
    escaped = false;
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    const apostrophe =
      (char === "'" || char === "’") &&
      /[\p{L}\p{N}]/u.test(input[i - 1] ?? "") &&
      /[\p{L}\p{N}]/u.test(input[i + 1] ?? "");
    if (!apostrophe && ['"', "'", "`", "“", "‘"].includes(char)) {
      quote = char === "“" ? "”" : char === "‘" ? "’" : char;
      continue;
    }
    if (pairs[char]) stack.push(pairs[char]);
    else if (stack.at(-1) === char) stack.pop();
    else if (!stack.length) output[i] = 1;
  }
  return output;
}
