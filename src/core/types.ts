import type { CaseState } from "./gamma/case-state";
import type { ModelId } from "./models";
import type { Source } from "./madon/sources";
export type Depth = "brief" | "standard" | "detailed" | "steps";
export type Thinking = "auto" | "on" | "off";
export type Evidence = {
  label: string;
  value: string;
  kind:
    | "Observed"
    | "Estimated"
    | "User-provided"
    | "Unavailable"
    | "Requires permission";
  group:
    "Browser" | "Device" | "Display" | "Network" | "Storage" | "Permissions";
};
export type Context = {
  case?: CaseState;
  pausedCases?: CaseState[];
  authoredSources?: string[];
  intent?: string;
  browser?: string;
  platform?: string;
  depth: Depth;
  updated: number;
  turns: number;
  flow?: { id: string; step: number };
  pending?: string[];
  topic?: string;
  goal?: string;
  lastAction?: string;
  detectedBrowser?: string;
  sources?: Source[];
  diagnosis?: {
    id: string;
    node: string;
    history: { node: string; answer: string }[];
    outcome?: "resolved" | "escalated";
  };
  attempted: string[];
};
export type Knowledge = {
  pack?: string;
  relationships?: {
    id: string;
    kind: "related" | "requires" | "alternative" | "possible-cause" | "part-of";
  }[];
  id: string;
  category: string;
  title: string;
  phrases: string[];
  keywords: string[];
  answer: string;
  steps: string[];
  followups: string[];
  related: string[];
  reference: string;
  reviewed: string;
  subcategory?: string;
  entities?: string[];
  browsers?: string[];
  platforms?: string[];
  risk?: "low" | "data-loss" | "security";
  safety?: string;
  exceptions?: string[];
  conditions?: string[];
  capabilities?: string[];
  confidence?: number;
};
export type Response = {
  sources?: Source[];
  text: string;
  context: Context;
  evidence?: Evidence[];
  analysis?: string[];
  followups?: string[];
  effect?: {
    type:
      | "theme"
      | "think"
      | "new"
      | "clear"
      | "export"
      | "model"
      | "web"
      | "enhance";
    value?: string;
  };
};
export type Message = {
  model?: ModelId;
  modelVersion?: string;
  sources?: Source[];
  failure?: string;
  id: string;
  role: "user" | "assistant";
  text: string;
  evidence?: Evidence[];
  analysis?: string[];
  followups?: string[];
  stopped?: boolean;
  contextBefore?: Context;
};
export type Conversation = {
  id: string;
  title: string;
  pinned: boolean;
  updated: number;
  messages: Message[];
  context: Context;
};
export type Preferences = {
  model: ModelId;
  webSources: boolean;
  enhanced: boolean;
  theme: "light" | "dark" | "system";
  thinking: Thinking;
  name: string;
  device: string;
};
export const emptyContext = (): Context => ({
  depth: "standard",
  updated: Date.now(),
  turns: 0,
  attempted: [],
});
