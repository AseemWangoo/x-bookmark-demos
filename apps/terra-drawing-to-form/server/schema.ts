import { z } from "zod"

import type { FormTemplate } from "../src/lib/types"

const imageDataUrl = z
  .string()
  .regex(/^data:image\/(?:png|jpeg|webp);base64,/, "unsupported image data URL")
  .refine((value) => {
    const encoded = value.slice(value.indexOf(",") + 1)
    return Math.floor((encoded.length * 3) / 4) <= 10 * 1024 * 1024
  }, "image exceeds 10 MB")

export const extractRequestSchema = z
  .object({
    templateId: z.string().min(1),
    sampleId: z.string().min(1).optional(),
    imageDataUrl: imageDataUrl.optional(),
    width: z.number().int().positive().max(2048),
    height: z.number().int().positive().max(2048),
    effort: z.enum(["none", "low", "medium", "high"]).optional(),
    forceMock: z.boolean().optional(),
  })
  .refine((body) => Boolean(body.sampleId) !== Boolean(body.imageDataUrl), {
    message: "provide exactly one of sampleId or imageDataUrl",
  })

export const modelOutputSchema = z.object({
  fields: z.array(
    z.object({
      key: z.string(),
      value: z.string().nullable(),
      confidence: z.number().min(0).max(1),
      bbox_px: z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()]).nullable(),
      note: z.string().nullable(),
    }),
  ),
})

export function buildSchema(template: FormTemplate) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["fields"],
    properties: {
      fields: {
        type: "array",
        minItems: template.fields.length,
        maxItems: template.fields.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "value", "confidence", "bbox_px", "note"],
          properties: {
            key: { type: "string", enum: template.fields.map((field) => field.key) },
            value: { type: ["string", "null"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            bbox_px: {
              anyOf: [
                {
                  type: "array",
                  items: { type: "integer" },
                  minItems: 4,
                  maxItems: 4,
                },
                { type: "null" },
              ],
            },
            note: { type: ["string", "null"] },
          },
        },
      },
    },
  } as const
}
