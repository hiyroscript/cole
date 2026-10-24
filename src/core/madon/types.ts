import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
export type State =
  | "not-initialized"
  | "checking"
  | "unsupported"
  | "download-ready"
  | "downloading"
  | "loading"
  | "ready"
  | "generating"
  | "cancelling"
  | "error"
  | "insufficient-memory"
  | "cache-unavailable";
export type Snapshot = {
  state: State;
  detail: string;
  progress?: number;
  technical?: string;
  webgpu?: boolean;
  storage?: number;
  cached?: boolean;
};
export type Generation = {
  messages: ChatCompletionMessageParam[];
  thinking: boolean;
  maxTokens: number;
};
export type Transport = {
  initialize(
    progress: (value: { progress: number; text: string }) => void,
  ): Promise<void>;
  generate(request: Generation): AsyncIterable<string>;
  interrupt(): void;
  dispose(): void;
};
