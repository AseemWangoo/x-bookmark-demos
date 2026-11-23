import { describe, expect, test } from "bun:test";

import { TOKENS_PER_SEC_FORMULA, tokensPerSec, tokensPerSecLabel } from "../shared/metrics.ts";

describe("tokens/sec", () => {
  test("divides completion tokens by generation seconds after TTFT", () => {
    const rate = tokensPerSec({ completionTokens: 210, ttftMs: 240, wallMs: 3100 });
    expect(rate).toBeCloseTo(210 / ((3100 - 240) / 1000), 8);
    expect(tokensPerSecLabel(rate)).toBe(TOKENS_PER_SEC_FORMULA);
  });

  test("is n/a when usage or a positive generation window is missing", () => {
    expect(tokensPerSec({ completionTokens: null, ttftMs: 240, wallMs: 3100 })).toBeNull();
    expect(tokensPerSec({ completionTokens: 10, ttftMs: null, wallMs: 3100 })).toBeNull();
    expect(tokensPerSec({ completionTokens: 10, ttftMs: 100, wallMs: null })).toBeNull();
    expect(tokensPerSec({ completionTokens: 10, ttftMs: 100, wallMs: 100 })).toBeNull();
    expect(tokensPerSec({ completionTokens: 10, ttftMs: 100, wallMs: 50 })).toBeNull();
    expect(tokensPerSecLabel(null)).toBe("n/a");
  });
});
