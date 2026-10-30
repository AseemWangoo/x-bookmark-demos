import OpenAI from "openai"
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses"

import { usageWithCost } from "../src/lib/pricing"
import type {
  Effort,
  ExtractionResponse,
  FormTemplate,
} from "../src/lib/types"
import { normalizeBbox } from "./bbox"
import { coerceValue } from "./coerce"
import { buildSchema, modelOutputSchema } from "./schema"

const SYSTEM_PROMPT = `You extract structured fields from technical documents.
Read only what is visible. Never infer or guess a missing or illegible value: return null.
Confidence is your assessment of legibility and ambiguity, from 0 to 1.
For each visible value, return bbox_px [x0,y0,x1,y1] covering the value text, not its label.
Coordinates use a top-left origin. Keep dimensions in their stated units.`

function renderTemplatePrompt(template: FormTemplate, width: number, height: number) {
  const fields = template.fields
    .map(
      (field) =>
        `- ${field.key}: ${field.label} (${field.type}${field.unit ? `, ${field.unit}` : ""})`,
    )
    .join("\n")
  return `Image dimensions: ${width} × ${height} pixels.\nExtract exactly these fields:\n${fields}`
}

export function buildTerraRequest(
  template: FormTemplate,
  imageDataUrl: string,
  width: number,
  height: number,
  model: string,
  effort: Effort,
): ResponseCreateParamsNonStreaming {
  return {
    model,
    reasoning: { effort },
    input: [
      {
        role: "developer",
        content: [{ type: "input_text", text: SYSTEM_PROMPT }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: renderTemplatePrompt(template, width, height),
          },
          { type: "input_image", image_url: imageDataUrl, detail: "original" },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "form_extraction",
        strict: true,
        schema: buildSchema(template),
      },
    },
    max_output_tokens: 4000,
    store: false,
  }
}

export async function extractWithTerra(args: {
  apiKey: string
  model: string
  effort: Effort
  template: FormTemplate
  imageDataUrl: string
  width: number
  height: number
}): Promise<ExtractionResponse> {
  const client = new OpenAI({ apiKey: args.apiKey })
  const started = performance.now()

  try {
    const response = await client.responses.create(
      buildTerraRequest(
        args.template,
        args.imageDataUrl,
        args.width,
        args.height,
        args.model,
        args.effort,
      ),
    )
    const parsed = modelOutputSchema.parse(JSON.parse(response.output_text))
    const fieldsByKey = new Map(args.template.fields.map((field) => [field.key, field]))
    const results = parsed.fields.map((result) => {
      const field = fieldsByKey.get(result.key)
      if (!field) throw new Error(`Unexpected field key: ${result.key}`)
      const coerced = coerceValue(field, result.value, result.confidence)
      return {
        key: result.key,
        ...coerced,
        bbox: normalizeBbox(result.bbox_px, args.width, args.height),
        note: coerced.note ?? result.note ?? undefined,
      }
    })
    const inputTokens = response.usage?.input_tokens ?? 0
    const outputTokens = response.usage?.output_tokens ?? 0
    const cachedTokens = response.usage?.input_tokens_details?.cached_tokens ?? 0

    return {
      mode: "live",
      model: args.model,
      results,
      usage: usageWithCost(inputTokens, outputTokens, cachedTokens),
      latencyMs: Math.round(performance.now() - started),
    }
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401 || error.status === 403) {
        throw new Error("OpenAI rejected this API key.")
      }
      if (error.status === 404) {
        throw new Error(
          `Your key can't use \`${args.model}\`; set \`TERRA_MODEL\` to an available model.`,
        )
      }
      if (error.status === 429) throw new Error("OpenAI rate limit reached. Try again shortly.")
      if (error.status && error.status >= 500) {
        throw new Error("OpenAI is temporarily unavailable.")
      }
    }
    if (error instanceof SyntaxError) {
      throw new Error("The model returned malformed structured output.")
    }
    throw error
  }
}
