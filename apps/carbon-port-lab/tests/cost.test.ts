import { describe, expect, test } from "bun:test";

import { costUsd, estimateTokens, roundUsd } from "../server/cost.ts";
import {
  INTRO_CACHED_INPUT_USD_PER_MILLION,
  INTRO_INPUT_USD_PER_MILLION,
  INTRO_OUTPUT_USD_PER_MILLION,
  POST_INTRO_CACHED_INPUT_USD_PER_MILLION,
  POST_INTRO_INPUT_USD_PER_MILLION,
  POST_INTRO_OUTPUT_USD_PER_MILLION,
} from "../shared/port.ts";

describe("intro cost", () => {
  test("uses intro rates and does not add reasoning tokens", () => {
    expect(INTRO_INPUT_USD_PER_MILLION).toBe(2);
    expect(INTRO_CACHED_INPUT_USD_PER_MILLION).toBe(0.1);
    expect(INTRO_OUTPUT_USD_PER_MILLION).toBe(10);
    expect(POST_INTRO_INPUT_USD_PER_MILLION).toBe(4);
    expect(POST_INTRO_CACHED_INPUT_USD_PER_MILLION).toBe(0.2);
    expect(POST_INTRO_OUTPUT_USD_PER_MILLION).toBe(20);

    const billed = costUsd({ inputTokens: 1_000, cachedInputTokens: 0, outputTokens: 500 });
    const ifReasoningWereAdded = costUsd({
      inputTokens: 1_000,
      cachedInputTokens: 0,
      outputTokens: 500 + 200,
    });
    expect(billed).toBe(0.007);
    expect(billed).not.toBe(ifReasoningWereAdded);
  });

  test("prices cached input at the intro cached rate and the rest as fresh input", () => {
    expect(costUsd({ inputTokens: 150, cachedInputTokens: 50, outputTokens: 10 })).toBe(0.000305);
    expect(costUsd({ inputTokens: 100, cachedInputTokens: 250, outputTokens: 0 })).toBe(
      costUsd({ inputTokens: 100, cachedInputTokens: 100, outputTokens: 0 }),
    );
    expect(costUsd({ inputTokens: 100, cachedInputTokens: -5, outputTokens: 0 })).toBe(0.0002);
  });

  test("rounds to six decimal places and estimates about four characters per token", () => {
    expect(roundUsd(0.0000004)).toBe(0);
    expect(roundUsd(0.0000014)).toBe(0.000001);
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });
});
