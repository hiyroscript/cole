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
  intent?: string;
  browser?: string;
  platform?: string;
  depth: Depth;
  updated: number;
  turns: number;
  flow?: { id: string; step: number };
  pending?: string[];
  attempted: string[];
};
export type Knowledge = {
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
  conditions?: string[];
  capabilities?: string[];
  confidence?: number;
};
export type Response = {
  text: string;
  context: Context;
  evidence?: Evidence[];
  analysis?: string[];
  followups?: string[];
  effect?: {
    type: "theme" | "think" | "new" | "clear" | "export";
    value?: string;
  };
};
export type Message = {
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
