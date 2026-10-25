import { observe, type Understanding } from "./observations";
import { entities, understand, type Entity } from "./language";
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
  entities: Entity[];
  dependsOn: number[];
  reference?: string;
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
const intent = (text: string): TaskIntent => {
  if (/^(?:calculate|convert)\b/i.test(text)) return "calculate";
  if (/^analyze\b/i.test(text)) return "analyze";
  if (/^(?:check|detect|inspect)\b/i.test(text)) return "observe";
  if (/^(?:compare|difference between)\b/i.test(text)) return "compare";
  if (/troubleshoot|diagnose|what should i (?:try|test)/i.test(text))
    return "troubleshoot";
  if (/^(?:what|why|how|explain|tell me)\b/i.test(text)) return "explain";
  return "unknown";
};
export function analyzeRequest(input: string): StructuredRequest {
  const request = understand(input);
  // Commands and supplied documents are opaque. Only explicit question/verb
  // boundaries split tasks: never split names such as "cache and cookies".
  const opaque = /^(?:run\s+)?\/|^analyze\s/i.test(input.trim());
  const clauses = opaque
    ? [input]
    : input.split(
        /(?:[?;]\s+|\.\s+(?=[A-Z])|,?\s+(?:and|also|then)\s+|,\s+)(?=(?:(?:also|then|and)\s+)?(?:what|why|how|explain|tell|check|detect|inspect|calculate|convert|compare|suggest|write|delete|search|look up)\b)/i,
      );
  const tasks: RequestTask[] = clauses.slice(0, 6).map((text, id) => {
    text = text.trim().replace(/^(?:and|also|then)\s+/i, "");
    const reference = text.match(/\b(?:it|that|them)\b/i)?.[0];
    return {
      id,
      text,
      intent: intent(text),
      entities: entities(text),
      dependsOn: reference && id ? [id - 1] : [],
      reference,
    };
  });
  return {
    locale: "en",
    understanding: observe(input),
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
