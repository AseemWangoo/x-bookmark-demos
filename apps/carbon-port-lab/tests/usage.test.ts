import { describe, expect, test } from "bun:test";

import { costUsd } from "../server/cost.ts";
import { normalizeUsage } from "../server/usage.ts";

describe("usage normalization", () => {
  test("reads AI SDK 7 token fields and keeps reasoning out of the bill", () => {
    const normalized = normalizeUsage(
      {
        inputTokens: 640,
        outputTokens: 2_100,
        inputTokenDetails: { cacheReadTokens: 40 },
        outputTokenDetails: { reasoningTokens: 800 },
      },
      "prompt",
      "output",
    );
    expect(normalized.usage).toEqual({
      inputTokens: 640,
      outputTokens: 2_100,
      cachedInputTokens: 40,
      reasoningTokens: 800,
      estimated: false,
    });
    expect(costUsd(normalized.usage)).toBe(
      costUsd({ inputTokens: 640, outputTokens: 2_100, cachedInputTokens: 40 }),
    );
    expect(costUsd(normalized.usage)).not.toBe(
      costUsd({ inputTokens: 640, outputTokens: 2_900, cachedInputTokens: 40 }),
    );
  });

  test("accepts a structured total and estimates when input or output is missing", () => {
    const structured = normalizeUsage(
      { inputTokens: { total: 80 }, outputTokens: { total: 20 } },
      "prompt",
      "output",
    );
    expect(structured.usage.inputTokens).toBe(80);
    expect(structured.usage.outputTokens).toBe(20);
    expect(structured.usage.estimated).toBe(false);
    expect(structured.notes.some((note) => note.includes("cacheReadTokens"))).toBe(true);

    const missing = normalizeUsage({}, "abcd", "abcdefgh");
    expect(missing.usage.estimated).toBe(true);
    expect(missing.usage.inputTokens).toBe(1);
    expect(missing.usage.outputTokens).toBe(2);
    expect(missing.usage.reasoningTokens).toBeNull();
    expect(missing.notes[0]).toContain("labelled estimate");
  });
});
