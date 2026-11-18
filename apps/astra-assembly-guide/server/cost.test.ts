import { describe, expect, test } from "bun:test";

import { costUsd, estimateUsage, ultrafastMultiplier, usageFromPayload } from "./cost.ts";

const quiet: Parameters<typeof costUsd>[2] = {
  inputTokens: 0,
  cachedTokens: 0,
  cacheWrite30mTokens: 0,
  cacheWrite12hTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
  estimated: false,
};

describe("costUsd", () => {
  test("prices fresh input and output and ignores reasoning tokens", () => {
    const without = costUsd("astra", "default", {
      ...quiet,
      inputTokens: 1800,
      outputTokens: 900,
      reasoningTokens: 0,
      totalTokens: 2700,
    });
    const withReasoning = costUsd("astra", "default", {
      ...quiet,
      inputTokens: 1800,
      outputTokens: 900,
      reasoningTokens: 280,
      totalTokens: 2700,
    });
    expect(without.usd).toBe(0.0504);
    expect(withReasoning.usd).toBe(without.usd);
  });

  test("bills cached input at the cached rate", () => {
    const quote = costUsd("sol", "default", {
      ...quiet,
      inputTokens: 1500,
      cachedTokens: 200,
      outputTokens: 640,
      totalTokens: 2140,
    });
    expect(quote.usd).toBe(0.00902);
  });

  test("does not let cached tokens exceed input", () => {
    const quote = costUsd("astra", "default", {
      ...quiet,
      inputTokens: 100,
      cachedTokens: 500,
      outputTokens: 0,
    });
    expect(quote.usd).toBe(0.00004);
  });

  test("prices 30-minute and 12-hour cache writes separately", () => {
    const quote = costUsd("astra", "default", {
      ...quiet,
      inputTokens: 1000,
      cacheWrite30mTokens: 100,
      cacheWrite12hTokens: 50,
    });
    expect(quote.usd).toBe(0.01);
  });

  test("fast is 2× standard", () => {
    const standard = costUsd("sol", "default", {
      ...quiet,
      inputTokens: 1000,
      outputTokens: 100,
    });
    const fast = costUsd("sol", "fast", {
      ...quiet,
      inputTokens: 1000,
      outputTokens: 100,
    });
    expect(fast.multiplier).toBe(2);
    expect(fast.usd).toBe(standard.usd * 2);
  });

  test("ultrafast promo is 3× through 28 Feb 2027 Pacific and 6× after", () => {
    const usage = { ...quiet, inputTokens: 1000, outputTokens: 100 };
    const during = costUsd("astra", "ultrafast", usage, new Date("2027-03-01T07:00:00.000Z"));
    const after = costUsd("astra", "ultrafast", usage, new Date("2027-03-01T08:00:00.000Z"));
    const standard = costUsd("astra", "default", usage, new Date("2027-03-01T07:00:00.000Z"));
    expect(pacificDay(during)).toBe(true);
    expect(during.multiplier).toBe(3);
    expect(during.ultrafastPromo).toBe(true);
    expect(during.usd).toBeCloseTo(standard.usd * 3, 6);
    expect(after.multiplier).toBe(6);
    expect(after.ultrafastPromo).toBe(false);
    expect(after.usd).toBeCloseTo(standard.usd * 6, 6);
    expect(ultrafastMultiplier(new Date("2027-02-28T12:00:00.000Z"))).toBe(3);
  });
});

describe("usageFromPayload", () => {
  test("reads cache write TTLs and keeps reasoning out of output", () => {
    const usage = usageFromPayload(
      {
        input_tokens: 400,
        output_tokens: 50,
        total_tokens: 450,
        input_tokens_details: {
          cached_tokens: 40,
          cache_write_tokens: 30,
          cache_write_tokens_details: { ttl_30m_tokens: 10, ttl_12h_tokens: 20 },
        },
        output_tokens_details: { reasoning_tokens: 12 },
      },
      "fallback",
    );
    expect(usage.estimated).toBe(false);
    expect(usage.outputTokens).toBe(50);
    expect(usage.reasoningTokens).toBe(12);
    expect(usage.cacheWrite30mTokens).toBe(10);
    expect(usage.cacheWrite12hTokens).toBe(20);
    const quote = costUsd("astra", "default", usage);
    const doubled = costUsd("astra", "default", { ...usage, outputTokens: 62 });
    expect(quote.usd).not.toBe(doubled.usd);
  });

  test("treats missing cache writes as zero and labels a missing payload as an estimate", () => {
    const partial = usageFromPayload({ input_tokens: 10, output_tokens: 4 }, "");
    expect(partial.cacheWrite30mTokens).toBe(0);
    expect(partial.estimated).toBe(false);
    const missing = usageFromPayload(undefined, "abcd");
    expect(missing.estimated).toBe(true);
    expect(missing.inputTokens).toBe(1);
    expect(estimateUsage("").estimated).toBe(true);
  });
});

function pacificDay(quote: { ultrafastPromo: boolean }): boolean {
  return quote.ultrafastPromo;
}
