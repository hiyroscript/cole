import { observe, type Understanding } from "./observations";
import { entities, understand, type Entity } from "./language";
import { naturalTool } from "./natural-tools";
export type TaskIntent =
  | "explain"
  | "observe"
  | "calculate"
  | "analyze"
  | "compare"
  | "troubleshoot"
  | "unknown";
export type RequestTask = {
  id: number;
  text: string;
  intent: TaskIntent;
  subjects: string[];
  entities: Entity[];
  constraints: string[];
  dependsOn: number[];
  reference?: string;
  requiredCapabilities: string[];
  missingInformation: string[];
};
export type StructuredRequest = {
  locale: "en";
  understanding: Understanding;
  primaryIntent: TaskIntent;
  tasks: RequestTask[];
  omitted: number;
  exclusions: string[];
  dangerous: boolean;
  technicalIdentifiers: string[];
};
const verb =
  "can|could|would|please|what|why|how|which|explain|describe|define|tell|check|detect|inspect|calculate|compute|convert|compare|suggest|write|delete|search|look up|summarize|analyze|validate|format";
const intent = (text: string): TaskIntent => {
  const tool = naturalTool(text);
  if (tool) return tool.name === "calculate" ? "calculate" : "analyze";
  if (/^(?:check|detect|inspect)\b/i.test(text)) return "observe";
  if (/^(?:compare|difference between)\b/i.test(text)) return "compare";
  if (/troubleshoot|diagnose|what should i (?:try|test)/i.test(text))
    return "troubleshoot";
  if (/^(?:what|why|how|which|explain|describe|define|tell me)\b/i.test(text))
    return "explain";
  return "unknown";
};
function splitTasks(input: string): string[] {
  // Preserve payloads, quotations and conditional/contrast clauses. A source's
  // instruction-looking text must never become another user task.
  if (
    /^(?:run\s+)?\/|^(?:(?:please\s+)?(?:analyze|validate|format|check)\s+(?:(?:this|the)\s+)?(?:json|csv|log|text|[\[{])|analyze\s)/i.test(
      input.trim(),
    ) ||
    /```/.test(input)
  )
    return [input];
  const boundary = new RegExp(
    `(?:[?;]\\s+|\\.\\s+(?=[A-Z])|,?\\s+(?:and|also|then)\\s+|,\\s+)(?=(?:(?:also|then|and)\\s+)?(?:${verb})\\b)`,
    "gi",
  );
  const chunks: string[] = [];
  let start = 0;
  for (const match of input.matchAll(boundary)) {
    const before = input.slice(start, match.index);
    // Quoted user examples are data; an unmatched quotation blocks splitting.
    const quotes = (before.match(/"/g) ?? []).length;
    if (quotes % 2 || /^\s*(?:if|unless|when)\b/i.test(before)) continue;
    chunks.push(before);
    start = match.index! + match[0].length;
  }
  chunks.push(input.slice(start));
  return chunks.flatMap((chunk) => {
    chunk = chunk.trim().replace(/^(?:and|also|then)\s+/i, "");
    const coordinated = chunk.match(
      /^(explain|describe|define|what (?:is|are))\s+(.+?)[?.!]*$/i,
    );
    if (
      !coordinated ||
      /[";:]|\b(?:but|if|when|between|difference|relationship|without)\b/i.test(
        coordinated[2],
      )
    )
      return [chunk];
    const subjects = coordinated[2].split(/,\s*(?:and\s+)?|\s+and\s+/i);
    // Nominal coordination only; never treat a contrast or a predicate as a subject.
    if (
      subjects.length < 2 ||
      subjects.some(
        (s) =>
          !s ||
          s.split(/\s+/).length > 6 ||
          /\b(?:is|are|works|does|not|how|why)\b/i.test(s),
      )
    )
      return [chunk];
    return subjects.map((s) => `Explain ${s.trim()}`);
  });
}
export function analyzeRequest(input: string): StructuredRequest {
  const request = understand(input);
  const understanding = observe(input);
  const clauses = splitTasks(input);
  const tasks: RequestTask[] = clauses.slice(0, 6).map((text, id) => {
    const taskIntent = intent(text);
    const reference = text.match(/\b(?:it|that|them|each)\b/i)?.[0];
    const subject = text
      .replace(
        /^(?:explain|describe|define|what (?:is|are)|tell me about)\s+/i,
        "",
      )
      .replace(/[?.!]$/, "");
    return {
      id,
      text,
      intent: taskIntent,
      subjects:
        taskIntent === "explain"
          ? [subject]
          : entities(text)
              .filter((e) => ["api", "browser"].includes(e.kind))
              .map((e) => e.value),
      entities: entities(text),
      constraints: understanding.constraints,
      dependsOn: reference && id ? [id - 1] : [],
      reference,
      requiredCapabilities: [
        taskIntent === "calculate" || taskIntent === "analyze"
          ? taskIntent
          : "knowledge",
      ],
      missingInformation: reference && !id ? ["reference subject"] : [],
    };
  });
  return {
    locale: "en",
    understanding,
    primaryIntent: tasks[0]?.intent ?? "unknown",
    tasks,
    omitted: Math.max(0, clauses.length - tasks.length),
    exclusions: request.excluded,
    dangerous: request.dangerous,
    technicalIdentifiers: entities(input)
      .filter((e) => e.kind === "error")
      .map((e) => e.value),
  };
}
