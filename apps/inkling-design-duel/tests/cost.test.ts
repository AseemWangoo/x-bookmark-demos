import { describe, expect, test } from "bun:test";

import { costUsd, estimateTokens } from "../server/cost.ts";

describe("cost", () => {
  test("prices fresh input at $0.30 and output at $1.00 per million", () => {
    expect(costUsd({ promptTokens: 420, completionTokens: 310, cachedPromptTokens: 0 })).toBe(0.000436);
    expect(costUsd({ promptTokens: 420, completionTokens: 1640, cachedPromptTokens: 0 })).toBe(0.001766);
  });

  test("prices cached input at $0.03 and the rest of the prompt at $0.30", () => {
    expect(costUsd({ promptTokens: 1000, completionTokens: 100, cachedPromptTokens: 400 })).toBe(0.000292);
  });

  test("ignores a cached count larger than the prompt", () => {
    expect(costUsd({ promptTokens: 100, completionTokens: 0, cachedPromptTokens: 500 })).toBe(0.000003);
  });

  test("estimates tokens from text length when usage is missing", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });
});
