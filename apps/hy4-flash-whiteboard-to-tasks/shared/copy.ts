export const MOCK_BANNER =
  "Mock / Sample Mode — recorded outputs, no Hy4 flash calls";

export const LIVE_BANNER = "Live — Hy4 flash Chat Completions";

export const LIVE_REQUIRED =
  "Live mode needed to read your own images or text. Set a TokenHub or OpenRouter key.";

export const MOE_BADGE = "12B active / 224B MoE";

export const MOE_NOTE =
  "Badge matches the Hy4 flash launch post (12B active / 224B total, including 64B Engram). The model card is more precise: about 220B total, with 11.3B text + 0.43B vision active per token. This desk does not download the weights.";

export const CONTEXT_NOTE = "1,048,576 token context · hosted max input 960k · max output 64k";

export const MAX_IMAGES = 6;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_TEXT_CHARS = 400_000;

export const DEFAULT_MODELS = {
  tokenhub: "hy4-flash",
  openrouter: "tencent/hy4-flash",
  custom: "hy4-flash",
} as const;

export const TOKENHUB_INTL_BASE = "https://tokenhub-intl.tencentcloudmaas.com/v1";
export const TOKENHUB_GUANGZHOU_BASE = "https://tokenhub.tencentmaas.com/v1";
export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export const RECORDED_AT = "2026-11-20T08:00:00.000Z";
