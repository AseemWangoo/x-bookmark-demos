import { mkdir } from "node:fs/promises"
import path from "node:path"

import { Resvg } from "@resvg/resvg-js"

import { bracketDrawing } from "../samples/src/bracket-drawing"
import { motorSpecSheet } from "../samples/src/motor-spec-sheet"
import { serviceRequestForm } from "../samples/src/service-request-form"

const root = path.resolve(import.meta.dirname, "..")
const outputDir = path.join(root, "public/samples")
const fixtureDir = path.join(root, "fixtures")

await Promise.all([
  mkdir(outputDir, { recursive: true }),
  mkdir(fixtureDir, { recursive: true }),
])

for (const [id, build] of [
  ["bracket-drawing", bracketDrawing],
  ["service-request-form", serviceRequestForm],
  ["motor-spec-sheet", motorSpecSheet],
] as const) {
  const sample = build()
  const image = new Resvg(sample.svg, {
    fitTo: { mode: "original" },
    background: "rgba(255,255,255,1)",
  }).render()
  const normalized = Object.fromEntries(
    Object.entries(sample.regions).map(([key, region]) => [
      key,
      {
        x: region.x / sample.width,
        y: region.y / sample.height,
        w: region.w / sample.width,
        h: region.h / sample.height,
      },
    ]),
  )

  await Promise.all([
    Bun.write(path.join(outputDir, `${id}.png`), image.asPng()),
    Bun.write(
      path.join(fixtureDir, `${id}.regions.json`),
      `${JSON.stringify(normalized, null, 2)}\n`,
    ),
  ])
  console.log(`built ${id} (${sample.width}×${sample.height})`)
}
