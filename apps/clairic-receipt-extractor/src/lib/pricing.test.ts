import { expect, test } from "bun:test";
import {
  CLAIRIC_INPUT_USD_PER_MILLION,
  LLM_INPUT_USD_PER_MILLION,
  LLM_OUTPUT_USD_PER_MILLION,
  clairicCostUsd,
  costPerMillionDocuments,
  llmCostUsd,
} from "./pricing.ts";

test("clairic charges input tokens only", () => {
  expect(CLAIRIC_INPUT_USD_PER_MILLION).toBe(0.1);
  expect(clairicCostUsd(1_000_000)).toBeCloseTo(0.1);
  const withQuietOutput = costFromUsage({ input_tokens: 1_000, output_tokens: 0 });
  const withLoudOutput = costFromUsage({ input_tokens: 1_000, output_tokens: 99_999 });
  expect(withLoudOutput).toBe(withQuietOutput);
  expect(costPerMillionDocuments(clairicCostUsd(655))).toBeCloseTo(65.5);
});

test("llm cost adds input and output prices", () => {
  expect(llmCostUsd(1_000_000, 1_000_000)).toBeCloseTo(
    LLM_INPUT_USD_PER_MILLION + LLM_OUTPUT_USD_PER_MILLION,
  );
  expect(llmCostUsd(0, 0)).toBe(0);
});

function costFromUsage(usage: { input_tokens: number; output_tokens: number }): number {
  return clairicCostUsd(usage.input_tokens);
}
