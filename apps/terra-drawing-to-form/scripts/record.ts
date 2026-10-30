import path from "node:path"

import { samples } from "../server/http"
import { readEnv } from "../server/env"
import { extractWithTerra } from "../server/terra"
import { getTemplate } from "../src/templates"

const env = readEnv()
if (!env.apiKey) {
  throw new Error("OPENAI_API_KEY is required to record live fixtures.")
}

for (const sample of samples) {
  const template = getTemplate(sample.templateId)
  if (!template) throw new Error(`Missing template: ${sample.templateId}`)
  const file = Bun.file(
    path.resolve(import.meta.dirname, `../public/samples/${sample.id}.png`),
  )
  const imageDataUrl = `data:image/png;base64,${Buffer.from(
    await file.arrayBuffer(),
  ).toString("base64")}`
  const result = await extractWithTerra({
    apiKey: env.apiKey,
    model: env.model,
    effort: env.defaultEffort,
    template,
    imageDataUrl,
    width: sample.width,
    height: sample.height,
  })
  await Bun.write(
    path.resolve(import.meta.dirname, `../fixtures/${sample.id}.mock.json`),
    `${JSON.stringify(result, null, 2)}\n`,
  )
  console.log(`recorded ${sample.id}`)
}
