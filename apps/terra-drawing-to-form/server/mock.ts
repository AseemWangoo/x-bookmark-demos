import path from "node:path"

import type { ExtractionResponse } from "../src/lib/types"

export async function replayMock(
  sampleId: string,
  model: string,
  speed = 1,
): Promise<ExtractionResponse> {
  if (!["bracket-drawing", "service-request-form", "motor-spec-sheet"].includes(sampleId)) {
    throw new Error("Unknown sample")
  }
  const fixturePath = path.resolve(import.meta.dirname, `../fixtures/${sampleId}.mock.json`)
  const fixture = (await Bun.file(fixturePath).json()) as ExtractionResponse & {
    latencyMs: number
  }
  const visibleDelay = Math.min(1500, Math.max(100, fixture.latencyMs / speed))
  await Bun.sleep(visibleDelay)
  return { ...fixture, model, latencyMs: Math.round(visibleDelay) }
}
