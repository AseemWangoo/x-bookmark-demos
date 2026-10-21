import { expect, test } from "bun:test";
import { buildHighlightSegments } from "./segments.ts";

test("overlapping spans split the source and keep every field", () => {
  expect(
    buildHighlightSegments("abcdef", [
      { field: "a", start: 0, end: 4 },
      { field: "b", start: 2, end: 6 },
    ]),
  ).toEqual([
    { type: "mark", text: "ab", fields: ["a"] },
    { type: "mark", text: "cd", fields: ["a", "b"] },
    { type: "mark", text: "ef", fields: ["b"] },
  ]);
});

test("adjacent spans stay separate when the fields differ", () => {
  expect(
    buildHighlightSegments("abcdef", [
      { field: "a", start: 0, end: 3 },
      { field: "b", start: 3, end: 6 },
    ]),
  ).toEqual([
    { type: "mark", text: "abc", fields: ["a"] },
    { type: "mark", text: "def", fields: ["b"] },
  ]);
});

test("out-of-range spans are clamped or dropped", () => {
  expect(
    buildHighlightSegments("ab", [
      { field: "a", start: -10, end: 1 },
      { field: "b", start: 5, end: 9 },
      { field: "c", start: 2, end: 1 },
    ]),
  ).toEqual([
    { type: "mark", text: "a", fields: ["a"] },
    { type: "text", text: "b" },
  ]);
});
