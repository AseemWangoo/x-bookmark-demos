import { describe, expect, test } from "bun:test";

import { FIXTURES } from "../shared/fixtures.ts";

describe("whiteboard art", () => {
  test("every image quote is drawn on its SVG board", async () => {
    const quotes = new Map<string, string[]>();
    for (const fixture of FIXTURES) {
      for (const item of [...fixture.board.tasks, ...fixture.board.openQuestions]) {
        if (item.source.type !== "image" || !item.source.quote || !item.source.imageId) continue;
        const list = quotes.get(item.source.imageId) ?? [];
        list.push(item.source.quote);
        quotes.set(item.source.imageId, list);
      }
    }
    expect(quotes.size).toBeGreaterThan(0);
    for (const [id, lines] of quotes) {
      const svg = await Bun.file(new URL(`../shared/fixtures/boards/${id}.svg`, import.meta.url)).text();
      for (const line of lines) expect(svg).toContain(line);
    }
  });
});
