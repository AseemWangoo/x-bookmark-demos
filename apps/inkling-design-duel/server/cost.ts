import {
  CACHED_INPUT_USD_PER_MILLION,
  INPUT_USD_PER_MILLION,
  OUTPUT_USD_PER_MILLION,
  type TokenUsage,
} from "../shared/duel.ts";

export function costUsd(
  usage: Pick<TokenUsage, "promptTokens" | "completionTokens" | "cachedPromptTokens">,
): number {
  const cached = clampCached(usage.cachedPromptTokens, usage.promptTokens);
  const fresh = usage.promptTokens - cached;
  const dollars =
    (fresh * INPUT_USD_PER_MILLION +
      cached * CACHED_INPUT_USD_PER_MILLION +
      usage.completionTokens * OUTPUT_USD_PER_MILLION) /
    1_000_000;
  return roundUsd(dollars);
}

export function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export { formatUsd } from "../shared/duel.ts";

/** Labelled fallback when a compatible response omits usage. ~4 characters per token. */
export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.ceil(trimmed.length / 4);
}

function clampCached(cached: number, prompt: number): number {
  if (!Number.isFinite(cached) || cached <= 0) return 0;
  if (!Number.isFinite(prompt) || prompt <= 0) return 0;
  return Math.min(cached, prompt);
}
