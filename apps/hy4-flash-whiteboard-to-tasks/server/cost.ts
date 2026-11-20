import type { ProviderId, Usage, CostQuote } from "../shared/types.ts";

/** Official USD per 1M tokens. Input / output / cache read. */
export const TOKENHUB_USD_LIST = { input: 0.07, output: 0.281, cache: 0.003 } as const;
/** Official CNY per 1M tokens. */
export const TOKENHUB_CNY_LIST = { input: 0.5, output: 2, cache: 0.02 } as const;
/** OpenRouter promo USD per 1M. Matches 50% of the official USD list, including cache read. */
export const OPENROUTER_USD = { input: 0.035, output: 0.1405, cache: 0.0015 } as const;

/** 2026-11-30 12:00:00 Asia/Shanghai. Shanghai is UTC+8 and does not observe DST. */
export const TOKENHUB_PROMO_CUTOFF_MS = Date.parse("2026-11-30T04:00:00.000Z");

export const TOKENHUB_PROMO_LABEL =
  "TokenHub promo 50% off input/output until 2026-11-30 12:00 Beijing";
export const TOKENHUB_LIST_LABEL = "TokenHub list";
export const TOKENHUB_CACHE_ASSUMPTION =
  "Cache-hit stays at list. The official note does not say the promo discounts cache reads.";
export const OPENROUTER_LABEL =
  "OpenRouter promo (50% off official USD). No published end date.";
export const OPENROUTER_ASSUMPTION =
  "OpenRouter cache read uses the published $0.0015 per 1M. Reasoning tokens are already inside output and are not added again.";
export const CUSTOM_LABEL = "Self-hosted — this desk does not meter a custom endpoint";
export const CUSTOM_ASSUMPTION =
  "A custom base URL is treated as self-hosted. No TokenHub or OpenRouter price is applied.";

export function tokenhubPromoActive(now: Date): boolean {
  return now.getTime() < TOKENHUB_PROMO_CUTOFF_MS;
}

export function roundMoney(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function nonNeg(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function splitInput(usage: Usage): { fresh: number; cached: number } {
  const input = nonNeg(usage.inputTokens);
  const cached = Math.min(nonNeg(usage.cachedTokens), input);
  return { fresh: input - cached, cached };
}

type Rates = { input: number; output: number; cache: number };

function bill(rates: Rates, fresh: number, cached: number, output: number): number {
  return roundMoney((fresh * rates.input + cached * rates.cache + output * rates.output) / 1_000_000);
}

export function quoteCost(provider: ProviderId, usage: Usage, now = new Date()): CostQuote {
  const { fresh, cached } = splitInput(usage);
  const output = nonNeg(usage.outputTokens);
  const reasoning = Math.min(nonNeg(usage.reasoningTokens), output);
  if (provider === "custom") {
    return {
      usd: null,
      cny: null,
      estimated: usage.estimated,
      promo: false,
      label: CUSTOM_LABEL,
      assumption: CUSTOM_ASSUMPTION,
      freshInputTokens: fresh,
      cachedTokens: cached,
      outputTokens: output,
      reasoningTokens: reasoning,
    };
  }
  if (provider === "openrouter") {
    return {
      usd: bill(OPENROUTER_USD, fresh, cached, output),
      cny: null,
      estimated: usage.estimated,
      promo: true,
      label: OPENROUTER_LABEL,
      assumption: OPENROUTER_ASSUMPTION,
      freshInputTokens: fresh,
      cachedTokens: cached,
      outputTokens: output,
      reasoningTokens: reasoning,
    };
  }
  const promo = tokenhubPromoActive(now);
  const usdRates: Rates = promo
    ? { input: TOKENHUB_USD_LIST.input / 2, output: TOKENHUB_USD_LIST.output / 2, cache: TOKENHUB_USD_LIST.cache }
    : TOKENHUB_USD_LIST;
  const cnyRates: Rates = promo
    ? { input: TOKENHUB_CNY_LIST.input / 2, output: TOKENHUB_CNY_LIST.output / 2, cache: TOKENHUB_CNY_LIST.cache }
    : TOKENHUB_CNY_LIST;
  return {
    usd: bill(usdRates, fresh, cached, output),
    cny: bill(cnyRates, fresh, cached, output),
    estimated: usage.estimated,
    promo,
    label: promo ? TOKENHUB_PROMO_LABEL : TOKENHUB_LIST_LABEL,
    assumption: TOKENHUB_CACHE_ASSUMPTION,
    freshInputTokens: fresh,
    cachedTokens: cached,
    outputTokens: output,
    reasoningTokens: reasoning,
  };
}

export function estimateUsage(text: string, imageCount: number): Usage {
  const textTokens = Math.max(1, Math.ceil(text.trim().length / 4));
  const imageTokens = Math.max(0, imageCount) * 1100;
  const inputTokens = textTokens + imageTokens;
  const outputTokens = Math.max(64, Math.ceil(inputTokens / 8));
  return {
    inputTokens,
    cachedTokens: 0,
    outputTokens,
    reasoningTokens: 0,
    totalTokens: inputTokens + outputTokens,
    estimated: true,
  };
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function record(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function usageFromPayload(payload: unknown, fallbackText: string, imageCount: number): Usage {
  const usage = record(payload);
  if (!usage) return estimateUsage(fallbackText, imageCount);
  const input = finite(usage.prompt_tokens) ?? finite(usage.input_tokens);
  const output = finite(usage.completion_tokens) ?? finite(usage.output_tokens);
  if (input === null || output === null) return estimateUsage(fallbackText, imageCount);
  const promptDetails = record(usage.prompt_tokens_details) ?? record(usage.input_tokens_details) ?? {};
  const completionDetails =
    record(usage.completion_tokens_details) ?? record(usage.output_tokens_details) ?? {};
  const cached = finite(promptDetails.cached_tokens) ?? 0;
  const reasoning = finite(completionDetails.reasoning_tokens) ?? 0;
  const total = finite(usage.total_tokens) ?? input + output;
  return {
    inputTokens: input,
    cachedTokens: cached,
    outputTokens: output,
    reasoningTokens: reasoning,
    totalTokens: total,
    estimated: false,
  };
}
