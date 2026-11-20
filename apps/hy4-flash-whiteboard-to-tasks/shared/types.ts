import type { Board, Effort, Source } from "./schema.ts";

export type ProviderId = "tokenhub" | "openrouter" | "custom";

export type RunSource = "live" | "mock";

export type OutputMode = "json_schema" | "json_object" | "fenced" | "recorded";

export type Usage = {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  estimated: boolean;
};

export type CostQuote = {
  usd: number | null;
  cny: number | null;
  estimated: boolean;
  promo: boolean;
  label: string;
  assumption: string;
  freshInputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
};

export type ExtractImage = {
  id: string;
  name: string;
  dataUrl: string;
};

export type ExtractRequest = {
  text: string;
  images: ExtractImage[];
  fixtureId: string | null;
  effort: Effort;
  provider: ProviderId | null;
};

export type ExtractResult = {
  board: Board;
  latencyMs: number;
  ttftMs: number | null;
  usage: Usage;
  cost: CostQuote;
  source: RunSource;
  provider: ProviderId | "mock";
  model: string;
  effort: Effort;
  outputMode: OutputMode;
  timingsNote: string | null;
};

export type ProviderOption = {
  id: ProviderId;
  label: string;
  model: string;
  configured: boolean;
};

export type ModePayload = {
  mode: RunSource;
  banner: string;
  detail: string;
  provider: ProviderId | null;
  model: string;
  baseUrl: string | null;
  region: "intl" | "guangzhou" | null;
  effortDefault: Effort;
  providers: ProviderOption[];
  commands: string[];
  keyPresent: boolean;
};

export type { Board, Effort, Source };
