import type { ModelChoice, NormalizedUsage } from "./types.ts";

/**
 * USD per 1M tokens. Checked 2026-10-26.
 * Source: https://platform.kimi.ai/docs/pricing/chat
 * Flat across the 1,048,576-token window. Prices exclude tax.
 * Cache writes use the 5-minute TTL rate (the API default). 1h rates are recorded and unused.
 */
export const PRICES = {
  pro: { input: 2, output: 10, cachedInput: 0.2, write5m: 2, write1h: 4 },
  highspeed: { input: 4, output: 20, cachedInput: 0.2, write5m: 4, write1h: 8 },
} as const;

export const PRICING_CHECKED = "2026-10-26";

export const PRICING_SOURCE = "https://platform.kimi.ai/docs/pricing/chat";

export function estimateCostUsd(model: ModelChoice, usage: NormalizedUsage): number {
  const price = PRICES[model];
  // reasoning tokens are already inside completion. Bill completion once.
  return (
    (usage.uncached * price.input +
      usage.cached * price.cachedInput +
      usage.cacheWrite * price.write5m +
      usage.completion * price.output) /
    1_000_000
  );
}
