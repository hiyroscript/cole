import { knowledge } from "../../data/knowledge";
import type { Response } from "../types";
import type { NumericValue } from "./calculator";
import type { RequestTask } from "./request";
import { followupFrame } from "./followup";

type TaskResult = NonNullable<Response["tasks"]>[number];
type TaskInput =
  | {
      ready: true;
      text: string;
      subject?: string;
      comparison?: string[];
      calculationInput?: NumericValue;
    }
  | { ready: false; detail: string };

// Resolve only the explicitly planned predecessor(s). A failed step, a
// different output type, or an ambiguous group cannot borrow an older answer.
export function resolveTaskInput(
  task: RequestTask,
  completed: TaskResult[],
): TaskInput {
  if (!task.reference) return { ready: true, text: task.text };
  const missing: TaskInput = {
    ready: false,
    detail: `Which ${task.reference.kind === "result" ? "calculation result" : "subject"} does “${task.reference.text}” refer to? This part needs a completed, unambiguous ${task.reference.kind === "result" ? "calculation" : "answer"} from its preceding part.`,
  };
  const prior = task.dependsOn.map((id) => completed.find((r) => r.id === id));
  if (!prior.length || prior.some((r) => r?.status !== "answered"))
    return missing;
  if (task.reference.kind === "result") {
    const value = prior.length === 1 ? prior[0]?.value : undefined;
    return value
      ? { ready: true, text: task.text, calculationInput: value }
      : missing;
  }
  const ids = [...new Set(prior.flatMap((r) => r!.subjects ?? r!.sources))];
  if (task.reference.kind === "group")
    return ids.length >= 2 && ids.length <= 4
      ? { ready: true, text: task.text, comparison: ids }
      : missing;
  if (ids.length !== 1) return missing;
  const subject = knowledge.find((k) => k.id === ids[0]);
  if (!subject) return missing;
  const followup = followupFrame(task.text);
  return {
    ready: true,
    text: followup
      ? task.text
      : task.text.slice(0, task.reference.start) +
        subject.title +
        task.text.slice(task.reference.end),
    subject: subject.id,
  };
}
