export const MODEL_KEYS = ["astra", "sol"] as const;
export type ModelKey = (typeof MODEL_KEYS)[number];

export const SERVICE_TIERS = ["default", "fast", "ultrafast"] as const;
export type ServiceTier = (typeof SERVICE_TIERS)[number];

export const DEFAULT_MODEL_IDS = {
  astra: "gpt-6.2-astra",
  sol: "gpt-6.2-sol",
} as const;

export const MOCK_BANNER = "Mock mode — recorded outputs, no OpenAI calls";
export const LIVE_BANNER = "Live mode — Responses API. The key stays on the server.";

export const PHOTO_MOCK_MESSAGE =
  "Live mode needed to read your own photo. Set OPENAI_API_KEY.";

export const CUSTOM_TEXT_MOCK_MESSAGE =
  "Mock mode only replays the two hand-authored kits. Load a fixture, or set OPENAI_API_KEY to assemble your own list.";

export const ULTRAFAST_PROMO_LABEL =
  "Ultrafast promotional pricing through 28 Feb 2027 (Pacific)";

export const ULTRAFAST_LIST_NOTE =
  "Ultrafast list rates from 1 Mar 2027 (Pacific) are 6× Standard (Astra $48 input / $240 output, Sol $12 input / $60 output, per 1M tokens). While the promo window is open the calculator uses the 3× table, not the 6× list.";

export const SHORT_CONTEXT_NOTE =
  "Short-context rates for inputs at or under 272K tokens. Long-context pricing (input and cache ×2, output ×1.5 for the whole request) is not applied.";

export const REASONING_NOTE =
  "reasoning.effort is low. The API rejects none. Official guidance for a new integration starts at medium; this desk keeps low for a short extraction and does not expose an effort toggle. Reasoning tokens are a subset of output tokens and are not added again into the USD total.";

export function tierLabel(tier: ServiceTier): string {
  switch (tier) {
    case "default":
      return "Standard";
    case "fast":
      return "Fast";
    case "ultrafast":
      return "Ultrafast";
    default: {
      const unknown: never = tier;
      return unknown;
    }
  }
}

export function modelLabel(key: ModelKey): string {
  switch (key) {
    case "astra":
      return "Astra";
    case "sol":
      return "Sol";
    default: {
      const unknown: never = key;
      return unknown;
    }
  }
}
