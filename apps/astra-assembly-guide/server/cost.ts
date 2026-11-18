import type { ModelKey, ServiceTier } from "../shared/copy.ts";
import { formatUsd } from "../shared/format.ts";
import type { Usage } from "../shared/usage.ts";

export { formatUsd };

export type { Usage };

/** Short-context USD per 1M tokens. Fast is 2×. Ultrafast promo is 3× through 28 Feb 2027 Pacific, then 6× list. */
export const STANDARD_PER_MILLION = {
  astra: { input: 8, cached: 0.4, write30m: 10, write12h: 20, output: 40 },
  sol: { input: 2, cached: 0.1, write30m: 2.5, write12h: 5, output: 10 },
} as const;

export const PROMO_LAST_PACIFIC_DAY = "2027-02-28";

export type CostQuote = {
  usd: number;
  estimated: boolean;
  multiplier: number;
  ultrafastPromo: boolean;
};

export function pacificDateKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function ultrafastMultiplier(now: Date): 3 | 6 {
  return pacificDateKey(now) <= PROMO_LAST_PACIFIC_DAY ? 3 : 6;
}

export function tierMultiplier(tier: ServiceTier, now: Date): number {
  switch (tier) {
    case "default":
      return 1;
    case "fast":
      return 2;
    case "ultrafast":
      return ultrafastMultiplier(now);
    default: {
      const unknown: never = tier;
      throw new Error(`Unknown tier ${String(unknown)}`);
    }
  }
}

export function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function costUsd(
  model: ModelKey,
  tier: ServiceTier,
  usage: Usage,
  now = new Date(),
): CostQuote {
  const rates = STANDARD_PER_MILLION[model];
  const multiplier = tierMultiplier(tier, now);
  const cached = clampCached(usage.cachedTokens, usage.inputTokens);
  const fresh = usage.inputTokens - cached;
  const dollars =
    ((fresh * rates.input +
      cached * rates.cached +
      nonNeg(usage.cacheWrite30mTokens) * rates.write30m +
      nonNeg(usage.cacheWrite12hTokens) * rates.write12h +
      nonNeg(usage.outputTokens) * rates.output) *
      multiplier) /
    1_000_000;
  return {
    usd: roundUsd(dollars),
    estimated: usage.estimated,
    multiplier,
    ultrafastPromo: tier === "ultrafast" && multiplier === 3,
  };
}

export function estimateUsage(text: string): Usage {
  const basis = Math.max(1, Math.ceil(text.trim().length / 4));
  const output = Math.max(1, Math.ceil(basis / 2));
  return {
    inputTokens: basis,
    cachedTokens: 0,
    cacheWrite30mTokens: 0,
    cacheWrite12hTokens: 0,
    outputTokens: output,
    reasoningTokens: 0,
    totalTokens: basis + output,
    estimated: true,
  };
}

export function usageFromPayload(usage: unknown, fallbackText: string): Usage {
  if (!isRecord(usage)) return estimateUsage(fallbackText);
  const input = finite(usage.input_tokens);
  const output = finite(usage.output_tokens);
  if (input === null || output === null) return estimateUsage(fallbackText);
  const details = isRecord(usage.input_tokens_details) ? usage.input_tokens_details : {};
  const outDetails = isRecord(usage.output_tokens_details) ? usage.output_tokens_details : {};
  const cached = finite(details.cached_tokens) ?? 0;
  const writeTotal = finite(details.cache_write_tokens);
  const writeDetails = isRecord(details.cache_write_tokens_details)
    ? details.cache_write_tokens_details
    : null;
  let write30 = 0;
  let write12 = 0;
  if (writeDetails) {
    write30 = finite(writeDetails.ttl_30m_tokens) ?? finite(writeDetails["30m"]) ?? 0;
    write12 = finite(writeDetails.ttl_12h_tokens) ?? finite(writeDetails["12h"]) ?? 0;
    if (write30 === 0 && write12 === 0 && writeTotal !== null) write30 = writeTotal;
  } else if (writeTotal !== null) {
    write30 = writeTotal;
  }
  const reasoning = finite(outDetails.reasoning_tokens) ?? 0;
  const total = finite(usage.total_tokens) ?? input + output;
  return {
    inputTokens: input,
    cachedTokens: Math.max(0, cached),
    cacheWrite30mTokens: Math.max(0, write30),
    cacheWrite12hTokens: Math.max(0, write12),
    outputTokens: output,
    reasoningTokens: Math.max(0, reasoning),
    totalTokens: total,
    estimated: false,
  };
}

function clampCached(cached: number, input: number): number {
  if (!Number.isFinite(cached) || cached <= 0) return 0;
  if (!Number.isFinite(input) || input <= 0) return 0;
  return Math.min(cached, input);
}

function nonNeg(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value;
}

function finite(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
