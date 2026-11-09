export const EFFORTS = {
  low: { name: "low", value: 0.2 },
  high: { name: "high", value: 0.9 },
} as const;

export type EffortName = keyof typeof EFFORTS;

export const EFFORT_ORDER: readonly EffortName[] = ["low", "high"];

export const INPUT_USD_PER_MILLION = 0.3;
export const CACHED_INPUT_USD_PER_MILLION = 0.03;
export const OUTPUT_USD_PER_MILLION = 1;

export const MOCK_BANNER = "Mock mode — recorded outputs, no Tinker calls";
export const LIVE_BANNER = "Live mode — Tinker sampling";

/** Scripts may run. Same-origin access to the desk is intentionally absent. */
export const IFRAME_SANDBOX = "allow-scripts";

export const OPENAI_BASE_URL =
  "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1";
export const ANTHROPIC_BASE_URL =
  "https://tinker.thinkingmachines.dev/services/tinker-prod/anthropic/api";

export const MODEL_BASE = "thinkingmachines/Inkling-2-Small";
export const MODEL_SERVERLESS =
  "thinkingmachines/Inkling-2-Small:peft:262144:sampling-nvfp4";

export const EXAMPLES = [
  "pricing page for an AI API",
  "settings panel with dark mode",
  "mobile onboarding carousel",
] as const;

export const LIVE_SETUP = [
  "export TINKER_API_KEY=…  # server process only, never the browser",
  "optional TINKER_MODEL — tried first, then the documented Inkling 2 Small ids",
  "optional TINKER_BASE_URL — overrides the OpenAI-compatible base URL only",
  "cd apps/inkling-design-duel && bun install && bun run dev",
] as const;

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  cachedPromptTokens: number;
  estimated: boolean;
};

export type Transport = "openai" | "anthropic";

export type GenerationResult = {
  html: string;
  reasoning?: string;
  latencyMs: number;
  usage: TokenUsage;
  costUsd: number;
  source: "mock" | "live";
  effort: EffortName;
  effortValue: number;
  model?: string;
  transport?: Transport;
};

export type PaneStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "done"; result: GenerationResult }
  | { status: "error"; message: string };

export type ModePayload = {
  mode: "mock" | "live";
  banner: string;
  detail: string;
  commands: readonly string[];
};

export type DuelEvent =
  | { type: "meta"; mode: "mock" | "live"; banner: string }
  | { type: "status"; effort: EffortName; state: "pending" }
  | { type: "result"; effort: EffortName; result: GenerationResult }
  | { type: "error"; effort: EffortName; message: string }
  | { type: "done" };

export function formatUsd(value: number): string {
  return `$${value.toFixed(6)}`;
}

export function effortValue(effort: EffortName): number {
  switch (effort) {
    case "low":
      return EFFORTS.low.value;
    case "high":
      return EFFORTS.high.value;
    default: {
      const unreachable: never = effort;
      return unreachable;
    }
  }
}
