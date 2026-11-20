import { LIVE_REQUIRED, RECORDED_AT } from "../../shared/copy.ts";
import { FIXTURES, normalizeText } from "../../shared/fixtures.ts";
import type { ExtractRequest, ExtractResult } from "../../shared/types.ts";
import { quoteCost } from "../cost.ts";
import type { ExtractAdapter } from "./types.ts";
import { ExtractError } from "./types.ts";

function sameImages(fixtureImages: { id: string; name: string }[], request: ExtractRequest): boolean {
  if (fixtureImages.length !== request.images.length) return false;
  const wanted = new Map(fixtureImages.map((image) => [image.id, image.name]));
  for (const image of request.images) {
    if (wanted.get(image.id) !== image.name) return false;
  }
  return true;
}

export function matchFixture(request: ExtractRequest) {
  const text = normalizeText(request.text);
  return FIXTURES.find((fixture) => {
    if (request.fixtureId && request.fixtureId !== fixture.id) return false;
    if (normalizeText(fixture.text) !== text) return false;
    return sameImages(fixture.images, request);
  });
}

export function createMockAdapter(env: NodeJS.ProcessEnv = process.env): ExtractAdapter {
  return {
    mode: "mock",
    async run(request) {
      const delay = Number(env.HY4_MOCK_DELAY_MS ?? "0");
      if (Number.isFinite(delay) && delay > 0) await Bun.sleep(delay);
      const fixture = matchFixture(request);
      if (!fixture) throw new ExtractError(LIVE_REQUIRED, 422);
      const recordedAt = new Date(RECORDED_AT);
      const think = request.effort === "high";
      const result: ExtractResult = {
        board: fixture.board,
        latencyMs: fixture.latencyMs,
        ttftMs: fixture.ttftMs,
        usage: fixture.usage,
        cost: quoteCost("tokenhub", fixture.usage, recordedAt),
        source: "mock",
        provider: "mock",
        model: "hy4-flash",
        effort: request.effort,
        outputMode: "recorded",
        timingsNote: think
          ? "Sample board is the recorded Flash (no_think) pass. Think was not recorded separately. No Hy4 flash call was made."
          : "Canned Flash timings and token counts. No Hy4 flash call was made.",
      };
      return result;
    },
  };
}
