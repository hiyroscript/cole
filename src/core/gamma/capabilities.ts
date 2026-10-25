import { calculate } from "./calculator";
export type Capability = {
  name: "calculate" | "analyze";
  description: string;
  environment: "both";
  permission: "none";
  sideEffects: "none";
  consent: "explicit-request";
  maxCharacters: number;
  execute: (input: string) => string;
};
function analyze(input: string) {
  const lines = input.split(/\r?\n/);
  const header = `Local analysis of user-provided, untrusted text (${input.length} characters, ${lines.length} lines); no commands were executed.`;
  if (/^[\s]*[\[{]/.test(input)) {
    try {
      const parsed: unknown = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      // Use a fence longer than any run in the document, preventing a breakout.
      const fence = "`".repeat(
        Math.max(
          3,
          ...[...formatted.matchAll(/`+/g)].map((m) => m[0].length + 1),
        ),
      );
      return `${header}\n\nStructurally valid JSON. This does not validate an application schema.\n\n${fence}json\n${formatted}\n${fence}`;
    } catch {
      return `${header}\n\nSyntax: invalid JSON. Check double-quoted keys and strings, commas between values, and matching brackets; trailing commas are not allowed.`;
    }
  }
  const signals = lines
    .flatMap((line, i) =>
      [
        ...line.matchAll(
          /\b(?:ERR_[A-Z_]+|DNS_PROBE_[A-Z_]+|HTTP\s+[45]\d\d|TypeError|SyntaxError|ReferenceError)\b/g,
        ),
      ].map((m) => `- Line ${i + 1}: ${m[0]}`),
    )
    .slice(0, 24);
  return `${header}\n\n${signals.length ? "Recognized technical identifiers (not a diagnosis):\n" + signals.join("\n") : "No supported technical identifiers found. Paste JSON or a short log containing browser errors, HTTP status codes or JavaScript errors."}`;
}
export const capabilities: readonly Capability[] = [
  {
    name: "calculate",
    description: "Bounded arithmetic, percentages and unit conversions",
    environment: "both",
    permission: "none",
    sideEffects: "none",
    consent: "explicit-request",
    maxCharacters: 500,
    execute: calculate,
  },
  {
    name: "analyze",
    description:
      "Validate JSON or locate technical identifiers in supplied text",
    environment: "both",
    permission: "none",
    sideEffects: "none",
    consent: "explicit-request",
    maxCharacters: 16000,
    execute: analyze,
  },
];
export function runCapability(
  name: string,
  input: string,
  signal?: AbortSignal,
): string {
  signal?.throwIfAborted();
  const capability = capabilities.find((c) => c.name === name);
  if (!capability) return "Unsupported local capability.";
  if (!input.trim() || input.length > capability.maxCharacters)
    return `Use /${name} with 1–${capability.maxCharacters} characters of explicit input.`;
  try {
    const output = capability.execute(input);
    signal?.throwIfAborted();
    return name === "calculate"
      ? `Calculated locally: **${output}**\n\nDeterministic arithmetic, rounded to 12 significant digits. Percent means division by 100; unit names are case-sensitive.`
      : output;
  } catch (error) {
    signal?.throwIfAborted();
    return `Cannot ${name}: ${error instanceof Error ? error.message : "invalid input"}.`;
  }
}
