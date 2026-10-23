import { expect, test } from "bun:test";
import { maxLatency, percentile50, scheduledBatchMs, speedupRatio } from "../src/lib/metrics.ts";

test("batch time, p50, and speedup", () => {
  expect(percentile50([10, 20, 30])).toBe(20);
  expect(percentile50([10, 30])).toBe(20);
  expect(percentile50([])).toBe(0);
  expect(maxLatency([3, 9, 1])).toBe(9);
  expect(scheduledBatchMs([10, 20, 30], 2)).toBe(40);
  expect(scheduledBatchMs([], 8)).toBe(0);
  expect(speedupRatio(40, 10)).toBe(4);
  expect(speedupRatio(10, 0)).toBeNull();
});
