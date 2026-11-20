import { describe, expect, test } from "bun:test";

import { LIVE_REQUIRED, MOCK_BANNER } from "../shared/copy.ts";
import { FIXTURES } from "../shared/fixtures.ts";
import { boardSchema } from "../shared/schema.ts";
import { createMockAdapter } from "./adapter/mock.ts";
import { ExtractError } from "./adapter/types.ts";
import { quoteCost } from "./cost.ts";
import { RECORDED_AT } from "../shared/copy.ts";
import { modePayload } from "./mode.ts";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function imagesFor(id: string) {
  const fixture = FIXTURES.find((item) => item.id === id);
  if (!fixture) throw new Error(id);
  return fixture.images.map((image) => ({ id: image.id, name: image.name, dataUrl: TINY_PNG }));
}

describe("mock adapter", () => {
  test("replays both hand-authored fixtures with working sources and canned cost", async () => {
    const adapter = createMockAdapter({});
    expect(adapter.mode).toBe("mock");
    for (const fixture of FIXTURES) {
      const result = await adapter.run({
        text: fixture.text,
        images: imagesFor(fixture.id),
        fixtureId: fixture.id,
        effort: "no_think",
        provider: null,
      });
      expect(boardSchema.parse(result.board)).toEqual(fixture.board);
      expect(result.source).toBe("mock");
      expect(result.provider).toBe("mock");
      expect(result.outputMode).toBe("recorded");
      expect(result.ttftMs).toBe(fixture.ttftMs);
      expect(result.usage.estimated).toBe(false);
      expect(result.cost).toEqual(quoteCost("tokenhub", fixture.usage, new Date(RECORDED_AT)));
      const lines = fixture.text.split("\n");
      for (const item of [...result.board.tasks, ...result.board.openQuestions]) {
        const source = item.source;
        if (source.type === "text") {
          expect(source.startLine).not.toBeNull();
          expect(source.endLine).not.toBeNull();
          const slice = lines.slice((source.startLine ?? 1) - 1, source.endLine ?? 0).join("\n");
          expect(slice).toContain(source.quote ?? "");
        } else {
          expect(fixture.images.some((image) => image.id === source.imageId)).toBe(true);
          expect(source.region).not.toBeNull();
        }
      }
    }
  });

  test("refuses an unknown photo and a novel thread", async () => {
    const adapter = createMockAdapter({});
    const fixture = FIXTURES[0];
    if (!fixture) throw new Error("missing fixture");
    await expect(
      adapter.run({
        text: fixture.text,
        images: [{ id: "upload-1", name: "photo.png", dataUrl: TINY_PNG }],
        fixtureId: null,
        effort: "no_think",
        provider: null,
      }),
    ).rejects.toThrow(LIVE_REQUIRED);
    await expect(
      adapter.run({
        text: "a brand new incident that was not on the sample board",
        images: [],
        fixtureId: fixture.id,
        effort: "high",
        provider: null,
      }),
    ).rejects.toThrow(ExtractError);
  });

  test("mode payload never includes a key and names the mock banner", () => {
    const secret = "super-secret-key-xyz";
    const payload = modePayload({
      MOCK: "1",
      TOKENHUB_API_KEY: secret,
      OPENROUTER_API_KEY: secret,
      HY4_FLASH_API_KEY: secret,
    });
    expect(payload.mode).toBe("mock");
    expect(payload.banner).toBe(MOCK_BANNER);
    expect(JSON.stringify(payload)).not.toContain(secret);
    expect(payload.keyPresent).toBe(true);
    expect(payload.providers.find((item) => item.id === "tokenhub")?.configured).toBe(true);
  });
});
