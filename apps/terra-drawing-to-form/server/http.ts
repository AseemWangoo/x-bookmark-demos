import path from "node:path"

import type { Effort, Sample } from "../src/lib/types"
import { getTemplate, templates } from "../src/templates"
import { readEnv, type TerraEnv } from "./env"
import { replayMock } from "./mock"
import { extractRequestSchema } from "./schema"
import { extractWithTerra } from "./terra"

export const samples: Sample[] = [
  {
    id: "bracket-drawing",
    title: "L-bracket drawing",
    kind: "Mechanical drawing",
    description: "Dimensions, tolerances, and a dense title block",
    imageUrl: "/samples/bracket-drawing.png",
    width: 1400,
    height: 900,
    templateId: "bracket-drawing",
  },
  {
    id: "service-request-form",
    title: "Service request",
    kind: "Hand-filled form",
    description: "Checkboxes, handwriting, one blank, and a smudge",
    imageUrl: "/samples/service-request-form.png",
    width: 1100,
    height: 1400,
    templateId: "service-request-form",
  },
  {
    id: "motor-spec-sheet",
    title: "Motor spec sheet",
    kind: "Technical datasheet",
    description: "A structured table of electrical ratings",
    imageUrl: "/samples/motor-spec-sheet.png",
    width: 1100,
    height: 1400,
    templateId: "motor-spec-sheet",
  },
]

function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

async function sampleDataUrl(sampleId: string) {
  const file = Bun.file(
    path.resolve(import.meta.dirname, `../public/samples/${sampleId}.png`),
  )
  return `data:image/png;base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`
}

export async function handleRequest(
  request: Request,
  envOverride?: TerraEnv,
): Promise<Response> {
  const url = new URL(request.url)
  const env = envOverride ?? readEnv()

  if (request.method === "GET" && url.pathname === "/api/mode") {
    return json({ mode: env.mode, model: env.model })
  }
  if (request.method === "GET" && url.pathname === "/api/samples") {
    return json(samples)
  }
  if (request.method === "GET" && url.pathname === "/api/templates") {
    return json(templates)
  }
  if (request.method !== "POST" || url.pathname !== "/api/extract") {
    return json({ error: "not_found" }, 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "invalid_json" }, 400)
  }
  const parsed = extractRequestSchema.safeParse(body)
  if (!parsed.success) {
    return json(
      { error: "invalid_request", details: parsed.error.issues.map((issue) => issue.message) },
      400,
    )
  }

  const template = getTemplate(parsed.data.templateId)
  if (!template) return json({ error: "unknown_template" }, 400)
  const useMock = env.mode === "mock" || parsed.data.forceMock

  if (useMock) {
    if (!parsed.data.sampleId) return json({ error: "live_required" }, 409)
    try {
      return json(
        await replayMock(parsed.data.sampleId, env.model, env.mockSpeed),
      )
    } catch {
      return json({ error: "unknown_sample" }, 400)
    }
  }

  if (!env.apiKey) return json({ error: "live_required" }, 409)

  try {
    const imageDataUrl =
      parsed.data.imageDataUrl ??
      (await sampleDataUrl(parsed.data.sampleId as string))
    return json(
      await extractWithTerra({
        apiKey: env.apiKey,
        model: env.model,
        effort: (parsed.data.effort ?? env.defaultEffort) as Effort,
        template,
        imageDataUrl,
        width: parsed.data.width,
        height: parsed.data.height,
      }),
    )
  } catch (error) {
    return json(
      {
        error: "extraction_failed",
        message: error instanceof Error ? error.message : "Extraction failed.",
      },
      502,
    )
  }
}
