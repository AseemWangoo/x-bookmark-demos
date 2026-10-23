import { expect, test } from "bun:test";
import { costPerThousand, decisionsCostUsd, responsesCostUsd } from "../src/lib/pricing.ts";
import type { Usage } from "../src/lib/types.ts";

function usage(partial: Partial<Usage> & Pick<Usage, "input_tokens" | "output_tokens">): Usage {
  return {
    input_tokens: partial.input_tokens,
    input_tokens_details: partial.input_tokens_details ?? { cached_tokens: 0, cache_write_tokens: 0 },
    output_tokens: partial.output_tokens,
    output_tokens_details: partial.output_tokens_details ?? { reasoning_tokens: 0 },
    total_tokens: partial.total_tokens ?? partial.input_tokens + partial.output_tokens,
  };
}

test("decisions output tokens are free and cached tokens are not double-counted", () => {
  const base = usage({
    input_tokens: 1_000_000,
    output_tokens: 50_000,
    input_tokens_details: { cached_tokens: 200_000, cache_write_tokens: 0 },
    output_tokens_details: { reasoning_tokens: 10_000 },
  });
  expect(decisionsCostUsd(base)).toBeCloseTo(0.082, 8);
  expect(decisionsCostUsd({ ...base, output_tokens: 1_000_000 })).toBeCloseTo(0.082, 8);

  const writes = usage({
    input_tokens: 1_000_000,
    output_tokens: 0,
    input_tokens_details: { cached_tokens: 100_000, cache_write_tokens: 50_000 },
  });
  expect(decisionsCostUsd(writes)).toBeCloseTo(0.09225, 8);
});

test("responses output and reasoning tokens bill once at $0.50 per million", () => {
  const bill = usage({
    input_tokens: 1_000_000,
    output_tokens: 1_000_000,
    output_tokens_details: { reasoning_tokens: 200_000 },
  });
  expect(responsesCostUsd(bill)).toBeCloseTo(0.6, 8);
  expect(responsesCostUsd({ ...bill, output_tokens_details: { reasoning_tokens: 0 } })).toBeCloseTo(0.6, 8);
  expect(costPerThousand(0.082, 10)).toBeCloseTo(8.2, 8);
});
