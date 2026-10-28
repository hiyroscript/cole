import { executionRequirement } from "./requirements";
import { observe, type Understanding } from "./observations";
import { entities, understand, type Entity } from "./language";
import { naturalTool } from "./natural-tools";
import { questionFrame, type QuestionFrame } from "./question";
import { topLevelText } from "./task-boundaries";
import { followupFrame } from "./followup";
import {
  resultReference,
  taskReference,
  type TaskReference,
} from "./task-reference";
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
  reference?: TaskReference;
  coordination?: number;
  requiredCapabilities: string[];
  missingInformation: string[];
  question?: QuestionFrame;
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
  "can|could|would|please|what|why|how|which|explain|describe|define|tell|show|give|repeat|check|detect|inspect|calculate|compute|convert|add|subtract|multiply|divide|compare|suggest|write|read|access|delete|search|look up|summarize|analyze|validate|format";
const intent = (text: string): TaskIntent => {
  const tool = naturalTool(text);
  if (tool) return tool.name === "calculate" ? "calculate" : "analyze";
  if (questionFrame(text) || followupFrame(text)) return "explain";
  if (/^(?:check|detect|inspect)\b/i.test(text)) return "observe";
  if (/^(?:compare|difference between)\b/i.test(text)) return "compare";
  if (/troubleshoot|diagnose|what should i (?:try|test)/i.test(text))
    return "troubleshoot";
  if (/^(?:what|why|how|which|explain|describe|define|tell me)\b/i.test(text))
    return "explain";
  return "unknown";
};
function splitTasks(input: string): { text: string; coordination?: number }[] {
  const payloadTool = naturalTool(input);
  if (
    payloadTool &&
    ((payloadTool.name !== "calculate" && payloadTool.name !== "stats") ||
      (payloadTool.name === "stats" &&
        /^[\d\s,.+eE?\-]+$/.test(payloadTool.input)))
  )
    return [{ text: input }];
  // Preserve payloads, quotations and conditional/contrast clauses. A source's
  // instruction-looking text must never become another user task.
  if (
    /^(?:run\s+)?\/|^(?:(?:please\s+)?(?:analyze|validate|format|check)\s+(?:(?:this|the)\s+)?(?:json|csv|log|text|[\[{])|analyze\s)/i.test(
      input.trim(),
    ) ||
    /```/.test(input)
  )
    return [{ text: input }];
  if (
    /^(?:count (?:the )?(?:words|characters|lines)|analyze text|compare texts|deduce|(?:analyze|summarize|check) (?:this )?csv)\b/i.test(
      input.trim(),
    )
  )
    return [{ text: input }];
  const boundary = new RegExp(
    `(?:[?.;]\\s+(?:Also|Then)\\s+|(?:[?;]\\s+|\\.\\s+(?=[A-Z])|,?\\s+(?:and|also|then)\\s+|,\\s+)(?=(?:(?:also|then|and)\\s+)?(?:(?:${verb})\\b|/)))`,
    "gi",
  );
  const chunks: string[] = [];
  const topLevel = topLevelText(input);
  let start = 0;
  for (const match of input.matchAll(boundary)) {
    const before = input.slice(start, match.index);
    if (
      !topLevel[match.index!] ||
      /^(?:(?:please|can you|could you|would you)[,\s]+)*(?:only\s+)?(?:if|unless|when|provided that|assuming)\b/i.test(
        before.trim(),
      )
    )
      continue;
    const next = input.slice(match.index! + match[0].length);
    // Shared-subject question elaborations stay one obligation. In "what
    // does HTTPS guarantee and what does it not guarantee", the negated
    // detail must be evaluated alongside the original subject.
    if (
      /\band\b/i.test(match[0]) &&
      /^\s*(?:what|why|how|can|could|does|do|is|are)\b/i.test(before) &&
      /^(?:what|why|how)\b/i.test(next) &&
      taskReference(next)?.kind === "subject"
    )
      continue;
    const tool = naturalTool(before);
    if (tool && !["calculate", "stats"].includes(tool.name)) break;
    chunks.push(before);
    start = match.index! + match[0].length;
  }
  chunks.push(input.slice(start));
  return chunks.flatMap((chunk, coordination) => {
    chunk = chunk.trim().replace(/^(?:and|also|then)\s+/i, "");
    const frame = questionFrame(chunk);
    if (
      !frame ||
      /["'`“‘;:()[\]{}]|\b(?:but|if|unless|when|between|difference|relationship|without|on|in|for|with|under|using)\b/i.test(
        frame.subject,
      )
    )
      return [{ text: chunk }];
    const subjects = frame.subject.split(/,\s*(?:and\s+)?|\s+and\s+/i);
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
      return [{ text: chunk }];
    const style = frame.style === "plain" ? " in simple terms" : "";
    return subjects.map((s) => ({
      text: `${frame.kind === "purpose" ? "What is the purpose of" : frame.style === "brief" ? "Give me a brief explanation of" : "Explain"} ${s.trim()}${style}`,
      coordination,
    }));
  });
}
export function analyzeRequest(input: string): StructuredRequest {
  const request = understand(input);
  const understanding = observe(input);
  const clauses = splitTasks(input);
  const tasks: RequestTask[] = [];
  for (const { text, coordination } of clauses.slice(0, 6)) {
    const id = tasks.length;
    const question = questionFrame(text);
    const taskIntent = intent(text);
    const reference =
      naturalTool(text)?.name === "calculate"
        ? resultReference(text)
        : taskReference(text);
    let dependsOn = reference && id ? [id - 1] : [];
    const prior = tasks.at(-1);
    if (reference?.kind === "group" && prior?.coordination !== undefined)
      dependsOn = tasks
        .filter((t) => t.coordination === prior.coordination)
        .map((t) => t.id);
    const subject = text
      .replace(
        /^(?:explain|describe|define|what (?:is|are)|tell me about)\s+/i,
        "",
      )
      .replace(/[?.!]$/, "");
    tasks.push({
      id,
      text,
      intent: taskIntent,
      subjects:
        taskIntent === "explain"
          ? [question?.subject ?? subject]
          : entities(text)
              .filter((e) => ["api", "browser"].includes(e.kind))
              .map((e) => e.value),
      entities: entities(text),
      constraints: understanding.constraints,
      dependsOn,
      reference,
      coordination,
      requiredCapabilities: [
        executionRequirement(text)?.kind ??
          naturalTool(text)?.name ??
          (taskIntent === "calculate" || taskIntent === "analyze"
            ? taskIntent
            : "knowledge"),
      ],
      missingInformation:
        reference && !id
          ? [
              reference.kind === "result"
                ? "prior calculation result"
                : "reference subject",
            ]
          : [],
      question,
    });
  }
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
