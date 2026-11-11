export const EFFORTS = ["low", "medium", "high"] as const;

export type Effort = (typeof EFFORTS)[number];

export const DEFAULT_MODEL = "google/gemini-4-carbon";

export const INTRO_INPUT_USD_PER_MILLION = 2;
export const INTRO_CACHED_INPUT_USD_PER_MILLION = 0.1;
export const INTRO_OUTPUT_USD_PER_MILLION = 10;
export const POST_INTRO_INPUT_USD_PER_MILLION = 4;
export const POST_INTRO_CACHED_INPUT_USD_PER_MILLION = 0.2;
export const POST_INTRO_OUTPUT_USD_PER_MILLION = 20;

export const INTRO_PRICING_LABEL = "intro pricing through 30 Nov 2026";

export const POST_INTRO_FOOTNOTE =
  "From 1 Dec 2026: $4.00 / 1M input, $0.20 / 1M cached input, $20.00 / 1M output, including thinking tokens.";

export const REASONING_FOOTNOTE =
  "Reasoning tokens are included in output tokens and are not added on top.";

export const MOCK_BANNER =
  "Mock mode — recorded outputs, no Gemini / AI Gateway calls";

export const LIVE_BANNER =
  "Live mode — generateText through AI Gateway. The API key stays on the server.";

export const LIVE_SETUP = [
  "Set AI_GATEWAY_API_KEY",
  "Optional AI_GATEWAY_MODEL (default google/gemini-4-carbon)",
  "bun install && bun run dev",
] as const;

export type PortSourceKind = "live" | "mock";

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number | null;
  estimated: boolean;
};

export type PortRequest = {
  source: string;
  language?: string;
  effort: Effort;
};

export type PortResult = {
  html: string;
  reasoning?: string;
  latencyMs: number;
  usage: Usage;
  costUsd: number;
  source: PortSourceKind;
  effort: Effort;
  model: string;
  notes: string[];
};

export type FixtureSummary = {
  id: string;
  title: string;
  language: string;
  source: string;
};

export type ModePayload = {
  mode: PortSourceKind;
  banner: string;
  model: string;
  setup: readonly string[];
  detail: string;
};

export function isEffort(value: string): value is Effort {
  return (EFFORTS as readonly string[]).includes(value);
}

export function effortLabel(effort: Effort): string {
  switch (effort) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default: {
      const unreachable: never = effort;
      return unreachable;
    }
  }
}

export function normalizeSource(source: string): string {
  return source.replaceAll("\r\n", "\n").trim();
}

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}
