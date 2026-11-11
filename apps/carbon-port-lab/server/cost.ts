import {
  INTRO_CACHED_INPUT_USD_PER_MILLION,
  INTRO_INPUT_USD_PER_MILLION,
  INTRO_OUTPUT_USD_PER_MILLION,
} from "../shared/port.ts";

export type CostInput = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
};

export function costUsd(usage: CostInput): number {
  const cached = clampCached(usage.cachedInputTokens, usage.inputTokens);
  const fresh = usage.inputTokens - cached;
  const dollars =
    (fresh * INTRO_INPUT_USD_PER_MILLION +
      cached * INTRO_CACHED_INPUT_USD_PER_MILLION +
      usage.outputTokens * INTRO_OUTPUT_USD_PER_MILLION) /
    1_000_000;
  return roundUsd(dollars);
}

export function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.ceil(trimmed.length / 4);
}

function clampCached(cached: number, input: number): number {
  if (!Number.isFinite(cached) || cached <= 0) return 0;
  if (!Number.isFinite(input) || input <= 0) return 0;
  return Math.min(cached, input);
}
