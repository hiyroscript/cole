import type { Context, Response } from "../types";
import { knowledge } from "../../data/knowledge";
import { rank } from "./retrieval";
import { assessAnswerability } from "./answerability";
import {
  selectedSummary,
  escapeDocument,
  type LocalDocument,
} from "./documents";
import { deep } from "./deep-runtime";
import { validateDeepDraft, type DeepInput } from "./deep-config";

export function deepEvidence(
  question: string,
  documents: LocalDocument[],
): DeepInput {
  if (
    /^(?:summarize|summary)(?:\s+(?:selected|these|the))?\s+documents?$/i.test(
      question,
    )
  ) {
    if (!documents.length) throw Error("Select a local document first.");
    const evidence = documents.slice(0, 4).map((doc, i) => ({
      id: `D${i + 1}`,
      title: doc.name,
      text: selectedSummary(doc)
        .map(
          (c) =>
            `${c.page ? `Page ${c.page}, ` : ""}line ${c.start}: ${c.text}`,
        )
        .join("\n")
        .slice(
          0,
          Math.min(1800, Math.floor(3200 / Math.min(documents.length, 4))),
        ),
    }));
    return {
      question:
        "Summarize the supplied document excerpts, preserving disagreements and uncertainty.",
      evidence,
    };
  }
  const candidates = rank(question);
  const record = candidates
    .map((c) => knowledge.find((k) => k.id === c.record.id))
    .find((k) => k && assessAnswerability(question, k).status === "direct");
  if (!record)
    throw Error(
      "Core has no directly supported evidence for that request. Try a supported topic or /deep summarize documents.",
    );
  return {
    question,
    evidence: [
      {
        id: "K1",
        title: record.title,
        text: record.answer.slice(0, 1800),
        url: record.reference,
      },
    ],
  };
}
export async function deepAnswer(
  arg: string,
  context: Context,
  documents: LocalDocument[],
  signal?: AbortSignal,
): Promise<Response> {
  const response = (
    text: string,
    status: "completed" | "rejected" = "completed",
  ): Response => ({ text, context, operation: { name: "deep", status } });
  if (!arg || arg.toLowerCase() === "status")
    return response(deep.getSnapshot().detail);
  if (arg.toLowerCase() === "off") {
    deep.disable();
    return response(deep.getSnapshot().detail);
  }
  if (arg.toLowerCase() === "clear") {
    await deep.remove();
    return response(deep.getSnapshot().detail);
  }
  if (arg.toLowerCase() === "on")
    return response(
      "Open Settings → Assistant setup → Gamma Deep Mode to review the model and explicitly approve its download.",
      "rejected",
    );
  const input = deepEvidence(arg, documents);
  const sources = input.evidence
    .map(
      (e) =>
        `**${e.id}: ${escapeDocument(e.title)}**\n\n> ${escapeDocument(e.text).replace(/\n/g, "\n> ")}`,
    )
    .join("\n\n");
  try {
    const result = await deep.generate(input, signal),
      draft = validateDeepDraft(result.text, input);
    return response(
      `Experimental Gamma Deep Mode draft · generated locally in ${(result.ms / 1000).toFixed(1)} s. Exact quotations were checked against the supplied excerpts; that does not establish that the explanation follows from them.\n\n${escapeDocument(draft.answer)}\n\n${draft.quotes.map((q) => `> ${escapeDocument(q.text)}\n\n— ${q.id}: ${escapeDocument(input.evidence.find((e) => e.id === q.id)!.title)}`).join("\n\n")}\n\nVerify against the supplied evidence:\n\n${sources}`,
    );
  } catch (error) {
    signal?.throwIfAborted();
    return response(
      `Deep Mode did not produce a validated draft: ${escapeDocument(error instanceof Error ? error.message : "model unavailable")}\n\nCore evidence remains available:\n\n${sources}`,
      "rejected",
    );
  }
}
