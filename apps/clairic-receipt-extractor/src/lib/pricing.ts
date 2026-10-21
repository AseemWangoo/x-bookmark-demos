export const CLAIRIC_MODEL_ID = "@cf/cloudflare/clairic";

export const CLAIRIC_INPUT_USD_PER_MILLION = 0.1;

export const CLAIRIC_PRICING_SOURCE =
  "https://developers.cloudflare.com/workers-ai/models/clairic/";

export const COMPARE_MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export const LLM_INPUT_USD_PER_MILLION = 0.293;

export const LLM_OUTPUT_USD_PER_MILLION = 2.253;

export const LLM_PRICING_SOURCE =
  "https://developers.cloudflare.com/workers-ai/platform/pricing/";

export function clairicCostUsd(inputTokens: number): number {
  return (inputTokens / 1_000_000) * CLAIRIC_INPUT_USD_PER_MILLION;
}

export function llmCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * LLM_INPUT_USD_PER_MILLION +
    (outputTokens / 1_000_000) * LLM_OUTPUT_USD_PER_MILLION
  );
}

export function costPerMillionDocuments(costPerCall: number): number {
  return costPerCall * 1_000_000;
}

export function inputTokens(usage: { input_tokens: number } | null): number | null {
  return usage ? usage.input_tokens : null;
}

export function outputTokens(usage: { output_tokens: number } | null): number | null {
  return usage ? usage.output_tokens : null;
}
