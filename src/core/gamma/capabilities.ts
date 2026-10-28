import {
  statisticsText,
  csvAnalysis,
  textAnalysis,
  textDifference,
  deduce,
} from "./data-tools";
import {
  calculate,
  calculateValue,
  displayValue,
  type NumericValue,
} from "./calculator";
export type Capability = {
  name: "calculate" | "analyze" | "stats" | "csv" | "text" | "diff" | "logic";
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
      const pending = [{ value: parsed, depth: 0 }];
      let nodes = 0;
      while (pending.length) {
        const node = pending.pop()!;
        if (++nodes > 5000 || node.depth > 64)
          return `${header}\n\nStructurally valid JSON; formatting is limited to 5,000 nodes and depth 64.`;
        if (node.value && typeof node.value === "object")
          for (const value of Object.values(node.value))
            pending.push({ value, depth: node.depth + 1 });
      }
      const formatted = JSON.stringify(parsed, null, 2);
      if (formatted.length > 32000)
        return `${header}\n\nStructurally valid JSON; formatted output exceeds the 32,000-character limit.`;
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
  ...Object.entries({
    stats: statisticsText,
    csv: csvAnalysis,
    text: textAnalysis,
    diff: textDifference,
    logic: deduce,
  }).map(([name, execute]) => ({
    name: name as Capability["name"],
    description: {
      stats: "Basic descriptive statistics",
      csv: "CSV structure and numeric-column summaries",
      text: "Unicode text counts",
      diff: "Line-occurrence comparison",
      logic: "Bounded deduction from explicit JSON premises",
    }[name]!,
    environment: "both" as const,
    permission: "none" as const,
    sideEffects: "none" as const,
    consent: "explicit-request" as const,
    maxCharacters: 16000,
    execute,
  })),

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
export type CapabilityResult = {
  name: string;
  status: "completed" | "rejected";
  text: string;
  value?: NumericValue;
};
export function executeCapability(
  name: string,
  input: string,
  signal?: AbortSignal,
  previous?: NumericValue,
): CapabilityResult {
  signal?.throwIfAborted();
  const capability = capabilities.find((c) => c.name === name);
  const rejected = (text: string): CapabilityResult => ({
    name,
    status: "rejected",
    text,
  });
  if (!capability) return rejected("Unsupported local capability.");
  if (!input.trim() || input.length > capability.maxCharacters)
    return rejected(
      `Use /${name} with 1–${capability.maxCharacters} characters of explicit input.`,
    );
  try {
    const value =
      name === "calculate" ? calculateValue(input, previous) : undefined;
    const output = value ? displayValue(value) : capability.execute(input);
    signal?.throwIfAborted();
    return {
      name,
      status: "completed",
      value,
      text:
        name === "calculate"
          ? `Calculated locally: **${output}**\n\nDeterministic arithmetic, rounded to 12 significant digits. Percent means division by 100; unit names are case-sensitive.`
          : output,
    };
  } catch (error) {
    signal?.throwIfAborted();
    return rejected(
      `Cannot ${name}: ${error instanceof Error ? error.message : "invalid input"}.`,
    );
  }
}
// Compatibility adapter for existing commands and callers.
export function runCapability(
  name: string,
  input: string,
  signal?: AbortSignal,
): string {
  return executeCapability(name, input, signal).text;
}
