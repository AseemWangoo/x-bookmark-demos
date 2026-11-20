import { describe, expect, test } from "bun:test";

import { FIXTURES } from "../shared/fixtures.ts";
import { BOARD_JSON_SCHEMA, boardSchema, parseBoard } from "../shared/schema.ts";

describe("board schema", () => {
  test("fixtures satisfy the strict board and the JSON schema requires every field", () => {
    for (const fixture of FIXTURES) {
      expect(boardSchema.parse(fixture.board)).toEqual(fixture.board);
    }
    expect(BOARD_JSON_SCHEMA.additionalProperties).toBe(false);
    expect([...BOARD_JSON_SCHEMA.required]).toEqual(["summary", "tasks", "openQuestions"]);
    const task = BOARD_JSON_SCHEMA.properties.tasks.items;
    expect(task.additionalProperties).toBe(false);
    expect(task.properties.source.additionalProperties).toBe(false);
    expect(task.properties.source.required).toContain("region");
  });

  test("an out-of-range region is dropped and the image link remains", () => {
    const fixture = FIXTURES[1];
    if (!fixture) throw new Error("missing fixture");
    const clone = structuredClone(fixture.board);
    const task = clone.tasks.find((item) => item.source.type === "image");
    if (!task) throw new Error("missing image task");
    task.source.region = { x: 2, y: 0, w: 0.2, h: 0.2 };
    const parsed = parseBoard(clone);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const updated = parsed.board.tasks.find((item) => item.id === task.id);
    expect(updated?.source.region).toBeNull();
    expect(updated?.source.imageId).toBe(task.source.imageId);
  });

  test("unknown keys fail the strict schema before fill", () => {
    const fixture = FIXTURES[0];
    if (!fixture) throw new Error("missing fixture");
    const extra = { ...fixture.board, note: "nope" };
    expect(boardSchema.safeParse(extra).success).toBe(false);
  });
});
