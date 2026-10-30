import type { Usage } from "./types"

export const PRICING_SOURCE =
  "https://developers.openai.com/api/docs/models/gpt-6.1-terra"
export const INPUT_USD_PER_MILLION = 1
export const OUTPUT_USD_PER_MILLION = 5

export function calculateCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens * INPUT_USD_PER_MILLION +
      outputTokens * OUTPUT_USD_PER_MILLION) /
    1_000_000
  )
}

export function usageWithCost(
  inputTokens: number,
  outputTokens: number,
  cachedTokens = 0,
): Usage {
  return {
    inputTokens,
    outputTokens,
    cachedTokens,
    costUsd: calculateCost(inputTokens, outputTokens),
  }
}
