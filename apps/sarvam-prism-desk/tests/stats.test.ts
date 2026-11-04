import { describe, expect, test } from "bun:test";

import { percentile } from "../src/lib/stats";

describe("stats", () => {
  test("p50 and p95 on a known array", () => {
    const values = [10, 20, 30, 40, 50];
    expect(percentile(values, 50)).toBe(30);
    expect(percentile(values, 95)).toBeCloseTo(48, 8);
    expect(percentile([], 50)).toBe(0);
    expect(percentile([7], 95)).toBe(7);
  });
});
