import { describe, expect, test } from "bun:test";

import { costInr, costPerLakhMessages } from "../src/lib/pricing";

describe("pricing", () => {
  test("153 tokens is ₹0.000612 and the lakh scales from that", () => {
    expect(costInr(153)).toBeCloseTo(0.000612, 10);
    expect(costPerLakhMessages(153)).toBeCloseTo(61.2, 8);
    expect(costInr(0)).toBe(0);
  });
});
