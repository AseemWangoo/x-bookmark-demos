import type { Usage } from "./types.ts";

/**
 * USD per 1M tokens.
 * Decisions: https://developers.openai.com/api/docs/guides/decisions
 *   input $0.10, cached input $0.01, cache writes at the gpt-6-luna rate $0.125, output $0.
 * Responses gpt-6-luna: https://developers.openai.com/api/docs/models/gpt-6-luna
 *   input $0.10, cached input $0.01, output $0.50. Reasoning tokens are included in output_tokens.
 */
export const PRICING = {
  decisionsInputPerMillion: 0.1,
  cachedInputPerMillion: 0.01,
  cacheWritePerMillion: 0.125,
  decisionsOutputPerMillion: 0,
  responsesOutputPerMillion: 0.5,
} as const;

export const PRICING_SOURCES = {
  decisions: "https://developers.openai.com/api/docs/guides/decisions",
  model: "https://developers.openai.com/api/docs/models/gpt-6-luna",
} as const;

function cachedTokens(usage: Usage): number {
  return usage.input_tokens_details?.cached_tokens ?? 0;
}

function cacheWriteTokens(usage: Usage): number {
  return usage.input_tokens_details?.cache_write_tokens ?? 0;
}

export function decisionsCostUsd(usage: Usage): number {
  const cached = cachedTokens(usage);
  const cacheWrite = cacheWriteTokens(usage);
  const uncached = Math.max(0, usage.input_tokens - cached - cacheWrite);
  const outputCharge = usage.output_tokens * PRICING.decisionsOutputPerMillion;
  return (
    (uncached * PRICING.decisionsInputPerMillion +
      cached * PRICING.cachedInputPerMillion +
      cacheWrite * PRICING.cacheWritePerMillion +
      outputCharge) /
    1_000_000
  );
}

export function responsesCostUsd(usage: Usage): number {
  const cached = cachedTokens(usage);
  const uncached = Math.max(0, usage.input_tokens - cached);
  // reasoning_tokens are already inside output_tokens. Bill output once.
  return (
    (uncached * PRICING.decisionsInputPerMillion +
      cached * PRICING.cachedInputPerMillion +
      usage.output_tokens * PRICING.responsesOutputPerMillion) /
    1_000_000
  );
}

export function costPerThousand(costUsd: number, messageCount: number): number {
  if (messageCount <= 0) return 0;
  return (costUsd / messageCount) * 1000;
}
