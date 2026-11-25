import { DEFAULT_MODEL, LIVE_REQUIRED } from "../../shared/copy.ts";
import type { TranscribeRequest } from "../../shared/types.ts";
import { decodeImage, loadFixture, sameBytes } from "../fixture.ts";
import { buildResult } from "../transcribe.ts";
import { TranscribeError, type TranscribeAdapter } from "./types.ts";

export function createMockAdapter(): TranscribeAdapter {
  return {
    mode: "mock",
    async transcribe(request: TranscribeRequest) {
      const started = performance.now();
      const fixture = loadFixture();
      const image = decodeImage(request.imageBase64);
      if (!sameBytes(image, fixture.bytes)) throw new TranscribeError(LIVE_REQUIRED, 422);
      return buildResult({
        rawMarkdown: fixture.markdown,
        wallMs: Math.round(performance.now() - started),
        doneReason: "recorded",
        source: "mock",
        model: DEFAULT_MODEL,
        warning: null,
        label: "",
      });
    },
  };
}
