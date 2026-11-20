import { describe, expect, test } from "bun:test";

import {
  OPENROUTER_USD,
  TOKENHUB_CNY_LIST,
  TOKENHUB_PROMO_CUTOFF_MS,
  TOKENHUB_USD_LIST,
  estimateUsage,
  quoteCost,
  splitInput,
  usageFromPayload,
} from "./cost.ts";

const million = {
  inputTokens: 1_000_000,
  cachedTokens: 200_000,
  outputTokens: 1_000_000,
  reasoningTokens: 100_000,
  totalTokens: 2_000_000,
  estimated: false,
};

const before = new Date(TOKENHUB_PROMO_CUTOFF_MS - 1);
const after = new Date(TOKENHUB_PROMO_CUTOFF_MS);

describe("quoteCost", () => {
  test("fresh input is prompt minus cached, and cached cannot exceed prompt", () => {
    expect(splitInput(million)).toEqual({ fresh: 800_000, cached: 200_000 });
    expect(splitInput({ ...million, cachedTokens: 5_000_000 }).cached).toBe(1_000_000);
  });

  test("TokenHub promo discounts input and output only, through the Beijing cutoff", () => {
    const promo = quoteCost("tokenhub", million, before);
    expect(promo.promo).toBe(true);
    expect(promo.usd).toBeCloseTo((800_000 * (TOKENHUB_USD_LIST.input / 2) + 200_000 * TOKENHUB_USD_LIST.cache + 1_000_000 * (TOKENHUB_USD_LIST.output / 2)) / 1_000_000, 6);
    expect(promo.cny).toBeCloseTo((800_000 * (TOKENHUB_CNY_LIST.input / 2) + 200_000 * TOKENHUB_CNY_LIST.cache + 1_000_000 * (TOKENHUB_CNY_LIST.output / 2)) / 1_000_000, 6);
    expect(promo.label).toContain("50%");
    expect(promo.assumption.toLowerCase()).toContain("cache");
  });

  test("TokenHub list rates apply at 2026-11-30 12:00 Beijing", () => {
    const list = quoteCost("tokenhub", million, after);
    expect(list.promo).toBe(false);
    expect(list.usd).toBeCloseTo((800_000 * TOKENHUB_USD_LIST.input + 200_000 * TOKENHUB_USD_LIST.cache + 1_000_000 * TOKENHUB_USD_LIST.output) / 1_000_000, 6);
    expect(list.cny).toBeCloseTo((800_000 * TOKENHUB_CNY_LIST.input + 200_000 * TOKENHUB_CNY_LIST.cache + 1_000_000 * TOKENHUB_CNY_LIST.output) / 1_000_000, 6);
    expect(list.label).toBe("TokenHub list");
  });

  test("reasoning tokens are not added on top of output", () => {
    const withReasoning = quoteCost("openrouter", million, before);
    const without = quoteCost("openrouter", { ...million, reasoningTokens: 0 }, before);
    expect(withReasoning.usd).toBe(without.usd);
    expect(withReasoning.reasoningTokens).toBe(100_000);
    expect(withReasoning.usd).toBeCloseTo(
      (800_000 * OPENROUTER_USD.input + 200_000 * OPENROUTER_USD.cache + 1_000_000 * OPENROUTER_USD.output) / 1_000_000,
      6,
    );
    expect(withReasoning.promo).toBe(true);
    expect(withReasoning.label).toContain("No published end date");
  });

  test("a custom endpoint is not metered", () => {
    const quote = quoteCost("custom", million, before);
    expect(quote.usd).toBeNull();
    expect(quote.cny).toBeNull();
    expect(quote.promo).toBe(false);
    expect(quote.freshInputTokens).toBe(800_000);
  });

  test("missing usage becomes a labelled estimate", () => {
    const usage = usageFromPayload(null, "hello board", 2);
    expect(usage.estimated).toBe(true);
    expect(usage.inputTokens).toBeGreaterThan(1100);
    const quote = quoteCost("tokenhub", usage, before);
    expect(quote.estimated).toBe(true);
    expect(estimateUsage("", 0).outputTokens).toBeGreaterThan(0);
  });

  test("chat-completions usage fields are read without double counting", () => {
    const usage = usageFromPayload(
      {
        prompt_tokens: 1000,
        completion_tokens: 400,
        total_tokens: 1400,
        prompt_tokens_details: { cached_tokens: 250 },
        completion_tokens_details: { reasoning_tokens: 80 },
      },
      "",
      0,
    );
    expect(usage).toMatchObject({
      inputTokens: 1000,
      cachedTokens: 250,
      outputTokens: 400,
      reasoningTokens: 80,
      estimated: false,
    });
    const quote = quoteCost("tokenhub", usage, before);
    const freshOnly = quoteCost(
      "tokenhub",
      { ...usage, reasoningTokens: 0 },
      before,
    );
    expect(quote.usd).toBe(freshOnly.usd);
    expect(quote.freshInputTokens).toBe(750);
  });
});
