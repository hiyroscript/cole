import { respond, type EngineOptions } from "./engine";
import { parseCommand } from "./commands";
import { stream } from "./stream";
import type { Context, Message, Response } from "./types";
import { madon } from "./madon/runtime";
import { isExtension } from "../lib/extension";
export type ModelId = "zulvyn" | "madon";
export type RunOptions = EngineOptions & {
  history: Message[];
  webSources: boolean;
  signal: AbortSignal;
  onText: (text: string) => void;
  reduced: boolean;
};
export type AssistantEngine = {
  id: ModelId;
  name: string;
  description: string;
  capabilities: readonly string[];
  available: () => boolean;
  initialize: () => Promise<void>;
  unload: () => void;
  generate: (
    input: string,
    context: Context,
    options: RunOptions,
  ) => Promise<Response>;
};
export const models: readonly AssistantEngine[] = [
  {
    id: "zulvyn",
    name: "Zulvyn",
    description: "Fast local assistance.",
    capabilities: ["knowledge", "diagnostics", "commands", "context"],
    available: () => true,
    initialize: async () => {},
    unload: () => {},
    async generate(input, context, options) {
      const response = await respond(input, context, options);
      await stream(
        response.text,
        options.onText,
        options.signal,
        options.reduced,
      );
      return response;
    },
  },
  {
    id: "madon",
    name: "Madon",
    description: "Local Qwen3 AI · setup required.",
    capabilities: [
      "generation",
      "diagnostics",
      "commands",
      "context",
      "web-sources",
    ],
    available: () => !isExtension(),
    initialize: () => madon.initialize(),
    unload: () => madon.unload(),
    async generate(input, context, options) {
      if (parseCommand(input) || input.trim().startsWith("/"))
        return models[0].generate(input, context, options);
      if (import.meta.env.MODE === "extension" || isExtension())
        throw new Error(
          "Madon inference is supported on the website only. Select Zulvyn in this extension.",
        );
      return (await import("./madon/engine")).generate(input, context, options);
    },
  },
];
export const activeModel = (id: ModelId = "zulvyn") =>
  models.find((m) => m.id === id)!;
