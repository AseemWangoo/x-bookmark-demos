import path from "node:path"

import { describe, expect, test } from "bun:test"

import { normalizeBbox } from "../server/bbox"
import { coerceValue } from "../server/coerce"
import { handleRequest } from "../server/http"
import { buildSchema } from "../server/schema"
import { buildTerraRequest } from "../server/terra"
import { buildExport } from "../src/lib/export"
import type {
  BoundingBox,
  EditableField,
  ExtractionResponse,
  FormTemplate,
  SourceImage,
} from "../src/lib/types"
import { templates } from "../src/templates"

const root = path.resolve(import.meta.dirname, "..")

function iou(a: BoundingBox, b: BoundingBox) {
  const left = Math.max(a.x, b.x)
  const top = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.w, b.x + b.w)
  const bottom = Math.min(a.y + a.h, b.y + b.h)
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top)
  return intersection / (a.w * a.h + b.w * b.h - intersection)
}

describe("fixture honesty", () => {
  for (const template of templates) {
    test(`${template.id} has one honest result per field`, async () => {
      const mock = await Bun.file(
        path.join(root, `fixtures/${template.id}.mock.json`),
      ).json()
      const regions = await Bun.file(
        path.join(root, `fixtures/${template.id}.regions.json`),
      ).json()
      const keys = mock.results.map((result: { key: string }) => result.key)
      expect(new Set(keys).size).toBe(template.fields.length)
      expect(keys.sort()).toEqual(template.fields.map((field) => field.key).sort())

      for (const result of mock.results as Array<{
        key: string
        value: unknown
        bbox: BoundingBox | null
      }>) {
        if (result.value === null) {
          expect(result.bbox).toBeNull()
          continue
        }
        expect(result.bbox).not.toBeNull()
        const box = result.bbox as BoundingBox
        expect([box.x, box.y, box.w, box.h].every((value) => value >= 0 && value <= 1)).toBe(true)
        expect(iou(box, regions[result.key] as BoundingBox)).toBeGreaterThanOrEqual(0.5)
      }
    })
  }
})

describe("bbox", () => {
  test("normalizes, orders, clamps, and rejects zero area", () => {
    expect(normalizeBbox([20, 10, 60, 30], 100, 50)).toEqual({
      x: 0.2,
      y: 0.2,
      w: 0.4,
      h: 0.4,
    })
    expect(normalizeBbox([120, 40, -10, 10], 100, 50)).toEqual({
      x: 0,
      y: 0.2,
      w: 1,
      h: 0.6,
    })
    expect(normalizeBbox([10, 10, 10, 30], 100, 50)).toBeNull()
  })
})

describe("coercion", () => {
  test("coerces supported field types and protects unparsed values", () => {
    const numberField = { key: "n", label: "N", type: "number" as const }
    const dateField = { key: "d", label: "D", type: "date" as const }
    const booleanField = { key: "b", label: "B", type: "boolean" as const }
    expect(coerceValue(numberField, "1,250 mm", 0.9).value).toBe(1250)
    expect(coerceValue(numberField, "Ø 8.5", 0.9).value).toBe(8.5)
    expect(coerceValue(dateField, "30/10/2026", 0.9).value).toBe("2026-10-30")
    expect(coerceValue(dateField, "2026-10-30", 0.9).value).toBe("2026-10-30")
    expect(coerceValue(booleanField, "✓", 0.9).value).toBe(true)
    expect(coerceValue(booleanField, "yes", 0.9).value).toBe(true)
    expect(coerceValue(numberField, "unknown", 0.9)).toEqual({
      value: "unknown",
      confidence: 0.5,
      note: "unparsed",
    })
  })
})

describe("Terra request", () => {
  const template = templates[0] as FormTemplate

  test("uses a strict schema and required request guardrails", () => {
    const schema = buildSchema(template)
    expect(schema.additionalProperties).toBe(false)
    expect(schema.required).toEqual(["fields"])
    expect(schema.properties.fields.items.additionalProperties).toBe(false)
    expect(schema.properties.fields.items.required).toEqual([
      "key",
      "value",
      "confidence",
      "bbox_px",
      "note",
    ])
    expect(schema.properties.fields.items.properties.key.enum).toEqual(
      template.fields.map((field) => field.key),
    )

    const request = buildTerraRequest(
      template,
      "data:image/png;base64,AAAA",
      1400,
      900,
      "gpt-6.1-terra",
      "medium",
    )
    const serialized = JSON.stringify(request)
    expect(request.model).toBe("gpt-6.1-terra")
    expect(request.store).toBe(false)
    expect(serialized).toContain('"detail":"original"')
    expect(serialized).not.toContain("temperature")
    expect(serialized).not.toContain("top_p")
    expect(serialized).not.toContain("top_logprobs")
  })
})

test("buildExport preserves typed edits and model values", () => {
  const source: SourceImage = {
    name: "drawing.png",
    imageUrl: "/drawing.png",
    width: 100,
    height: 50,
  }
  const extraction: ExtractionResponse = {
    mode: "mock",
    model: "gpt-6.1-terra",
    results: [],
    usage: { inputTokens: 1, outputTokens: 2, costUsd: 0.000011 },
    latencyMs: 100,
  }
  const fields: EditableField[] = [
    {
      key: "overall_length",
      value: 625,
      modelValue: 620,
      edited: true,
      confidence: 0.9,
      bbox: null,
    },
  ]
  const result = buildExport({
    source,
    template: templates[0] as FormTemplate,
    extraction,
    fields,
    extractedAt: "2026-10-30T00:00:00.000Z",
  })
  expect(result.fields[0]?.value).toBe(625)
  expect(result.fields[0]?.modelValue).toBe(620)
  expect(typeof result.fields[0]?.value).toBe("number")
})

describe("mock handlers", () => {
  const mockEnv = {
    mode: "mock" as const,
    model: "gpt-6.1-terra",
    defaultEffort: "medium" as const,
    mockSpeed: 100,
  }

  test("does not expose a key and returns synthetic sample data", async () => {
    const mode = await handleRequest(
      new Request("http://test/api/mode"),
      { ...mockEnv, apiKey: "server-secret" },
    )
    expect(await mode.json()).toEqual({ mode: "mock", model: "gpt-6.1-terra" })

    const response = await handleRequest(
      new Request("http://test/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: "bracket-drawing",
          sampleId: "bracket-drawing",
          width: 1400,
          height: 900,
        }),
      }),
      mockEnv,
    )
    expect(response.status).toBe(200)
    expect((await response.json()).synthetic).toBe(true)
  })

  test("requires live mode for uploads and rejects bad bodies", async () => {
    const upload = await handleRequest(
      new Request("http://test/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: "bracket-drawing",
          imageDataUrl: "data:image/png;base64,AAAA",
          width: 1,
          height: 1,
        }),
      }),
      mockEnv,
    )
    expect(upload.status).toBe(409)
    expect(await upload.json()).toEqual({ error: "live_required" })

    const bad = await handleRequest(
      new Request("http://test/api/extract", {
        method: "POST",
        body: "{",
      }),
      mockEnv,
    )
    expect(bad.status).toBe(400)
  })
})
