import { expect, test } from "bun:test";
import { estimateSeconds, speedupRatio, stepsFor, totalSteps } from "./estimate.ts";

test("invoice steps scale with pages", () => {
  const seven = stepsFor("list_invoices", 7);
  expect(totalSteps(seven)).toBe(7);
  expect(seven.find((step) => step.label === "Click Next")).toBeUndefined();
  expect(estimateSeconds(seven, 8)).toBe(56);

  const all = stepsFor("list_invoices", 34);
  expect(all.find((step) => step.label === "Read page")?.count).toBe(4);
  expect(all.find((step) => step.label === "Click Next")?.count).toBe(3);
  expect(totalSteps(all)).toBe(13);

  const empty = stepsFor("list_invoices", 0);
  expect(empty.find((step) => step.label === "Read page")?.count).toBe(1);
});

test("vendor pages and add-vendor steps", () => {
  const vendors = stepsFor("list_vendors", 12);
  expect(vendors.find((step) => step.label === "Read page")?.count).toBe(2);
  expect(vendors.find((step) => step.label === "Click Next")?.count).toBe(1);
  expect(totalSteps(stepsFor("add_vendor", 99))).toBe(11);
});

test("speed-up ratio", () => {
  expect(speedupRatio(56, 7)).toBe(8);
  expect(speedupRatio(56, 0)).toBeNull();
});
