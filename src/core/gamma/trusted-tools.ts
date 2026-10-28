import type { Context, Response } from "../types";
import type { LocalDocument } from "./documents";
import { documentOperation } from "./documents";
import { executeCapability } from "./capabilities";
import { plan, resumePlan, evidenceAnswer, caseSummary } from "./reasoning";
import { knowledgeCommand } from "./packs";
import { memoryCommand } from "./memory";
import { probe } from "./probe";
import { webResponse } from "./web";
import { clearPublicCache } from "./public-sources";
import type { NumericValue } from "./calculator";
export type ToolSpec = {
  name: string;
  description: string;
  environment: "website-and-extension" | "website-only";
  permission: "none" | "web-opt-in" | "model-download-consent";
  sideEffect: "none" | "local-storage" | "network" | "device-query";
  consent: "explicit-user-request";
  maxInput: number;
};
export const trustedTools: readonly ToolSpec[] = [
  {
    name: "deep",
    description: "Explicit experimental local draft from selected evidence",
    sideEffect: "local-storage",
    maxInput: 500,
  },
  ...["stats", "csv", "text", "diff", "logic"].map((name) => ({
    name,
    description: "Bounded local data operation",
    sideEffect: "none",
    maxInput: 16000,
  })),
  {
    name: "calculate",
    description: "Bounded arithmetic and conversions",
    sideEffect: "none",
    maxInput: 500,
  },
  {
    name: "analyze",
    description: "JSON syntax and technical identifiers",
    sideEffect: "none",
    maxInput: 16000,
  },
  {
    name: "document",
    description: "Selected local document passages and structure",
    sideEffect: "none",
    maxInput: 300,
  },
  {
    name: "plan",
    description: "Select reversible diagnostic checks",
    sideEffect: "none",
    maxInput: 500,
  },
  {
    name: "reason",
    description: "Connect authored evidence",
    sideEffect: "none",
    maxInput: 500,
  },
  {
    name: "summary",
    description: "Current supported task report",
    sideEffect: "none",
    maxInput: 0,
  },
  {
    name: "knowledge",
    description: "Install or remove static domain packs",
    sideEffect: "local-storage",
    maxInput: 100,
  },
  {
    name: "memory",
    description: "Explicit supported local preferences",
    sideEffect: "local-storage",
    maxInput: 100,
  },
  {
    name: "probe",
    description: "Test WebGPU adapter availability",
    sideEffect: "device-query",
    maxInput: 20,
  },
  {
    name: "research",
    description:
      "Public Wikimedia or explicitly named MDN compatibility lookup; local cache removal",
    sideEffect: "network",
    maxInput: 160,
  },
].map((t) => ({
  ...t,
  environment: t.name === "deep" ? "website-only" : "website-and-extension",
  permission:
    t.name === "research"
      ? "web-opt-in"
      : t.name === "deep"
        ? "model-download-consent"
        : "none",
  consent: "explicit-user-request",
})) as ToolSpec[];
export async function executeTrustedTool(
  name: string,
  arg: string,
  c: Context,
  options: {
    signal?: AbortSignal;
    document?: LocalDocument;
    documents?: LocalDocument[];
    webSources?: boolean;
    calculationInput?: NumericValue;
  },
): Promise<Response | undefined> {
  const tool = trustedTools.find((t) => t.name === name);
  if (!tool) return;
  options.signal?.throwIfAborted();
  const result = (text: string): Response => ({ text, context: c });
  if (arg.length > tool.maxInput)
    return result(`/${name} accepts at most ${tool.maxInput} characters.`);
  try {
    let response: Response;
    switch (name) {
      case "deep":
        response = await (
          await import("./deep-answer")
        ).deepAnswer(
          arg,
          c,
          options.documents ?? (options.document ? [options.document] : []),
          options.signal,
        );
        break;
      case "calculate":
      case "stats":
      case "csv":
      case "text":
      case "diff":
      case "logic":
      case "analyze": {
        const execution = executeCapability(
          name,
          arg,
          options.signal,
          options.calculationInput,
        );
        response = {
          ...result(execution.text),
          operation: {
            name: execution.name,
            status: execution.status,
            value: execution.value,
          },
        };
        break;
      }
      case "document": {
        const execution = documentOperation(
          options.documents ?? (options.document ? [options.document] : []),
          arg,
        );
        response = { ...result(execution.text), operation: execution };
        break;
      }
      case "plan":
        response =
          arg === "resume" ? resumePlan(c) : plan(arg || c.goal || "", c);
        break;
      case "reason":
        response = evidenceAnswer(arg, c);
        break;
      case "summary":
        response = result(caseSummary(c));
        break;
      case "knowledge":
        response = result(await knowledgeCommand(arg, options.signal));
        break;
      case "memory":
        response = result(memoryCommand(arg));
        break;
      case "probe": {
        const p = await probe(arg, options.signal);
        response = result(`${p.feature}: ${p.state}. ${p.detail}`);
        break;
      }
      case "research":
        response =
          arg === "clear"
            ? result(await clearPublicCache())
            : ((await webResponse(
                "look up " + arg,
                c,
                options.webSources === true,
                options.signal ?? new AbortController().signal,
              )) ?? result("Use /research with a short public topic."));
        break;
      default:
        return;
    }
    options.signal?.throwIfAborted();
    return response;
  } catch (error) {
    options.signal?.throwIfAborted();
    return result(
      `/${name} could not complete: ${error instanceof Error ? error.message : "operation unavailable"}. No success is claimed.`,
    );
  }
}
