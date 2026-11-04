/**
 * Sarvam Prism pricing: ₹4 per 1M input tokens, ₹0 output, every plan.
 * https://docs.sarvam.ai/api/token-factory/models/sarvam-prism
 */
export const INR_PER_MILLION_INPUT_TOKENS = 4;
export const PRICING_SOURCE_URL =
  "https://docs.sarvam.ai/api/token-factory/models/sarvam-prism";

export function costInr(inputTokens: number): number {
  return (inputTokens * INR_PER_MILLION_INPUT_TOKENS) / 1_000_000;
}

/** Cost of 1,00,000 messages at this input size. */
export function costPerLakhMessages(inputTokensPerMessage: number): number {
  return costInr(inputTokensPerMessage) * 100_000;
}

export function formatInr(value: number): string {
  if (value < 1) {
    const fixed = value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    return `₹${fixed}`;
  }
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
