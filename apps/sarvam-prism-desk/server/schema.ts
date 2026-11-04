import { z } from "zod";

import { LANGS } from "../src/lib/types";

export const routeBodySchema = z.object({
  text: z.string().max(4000),
  lang: z.enum(LANGS).optional(),
  presetId: z.string().max(64).optional(),
  forceMock: z.boolean().optional(),
});

export const translateBodySchema = z.object({
  text: z.string().min(1).max(1000),
  targetLang: z.enum(LANGS),
});

export const usageSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
});

export const sarvamResponseSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), z.unknown()),
  usage: usageSchema,
  synthetic: z.literal(true).optional(),
});

export type SarvamResponse = z.infer<typeof sarvamResponseSchema>;

export const choiceAnswerSchema = z
  .object({
    type: z.literal("choice"),
    choice: z.string(),
    confidence: z.number(),
    probabilities: z.record(z.string(), z.number()),
  })
  .strict();

export const scoreAnswerSchema = z
  .object({
    type: z.literal("score"),
    score: z.number(),
    confidence: z.number(),
    legend: z.record(z.string(), z.string()),
    probabilities: z.record(z.string(), z.number()),
  })
  .strict();

export const noulAnswerSchema = z
  .object({
    type: z.literal("noul"),
    noul: z.number(),
  })
  .strict();

export const errorEnvelopeSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string(),
    request_id: z.string().optional(),
    param: z.string().optional(),
  }),
});

export function mapSarvamError(
  status: number,
  body: unknown,
): { status: number; code: string; message: string; requestId?: string } {
  const parsed = errorEnvelopeSchema.safeParse(body);
  const code = parsed.success ? parsed.data.error.code : "unknown_error";
  const upstream = parsed.success ? parsed.data.error.message : "Sarvam request failed";
  const param = parsed.success ? parsed.data.error.param : undefined;
  const requestId = parsed.success ? parsed.data.error.request_id : undefined;
  if (status === 402) return { status, code, message: "credits empty", requestId };
  if (status === 403) return { status, code, message: "bad key", requestId };
  if (status === 404) return { status, code, message: "set PRISM_MODEL", requestId };
  if (status === 422) {
    return {
      status,
      code,
      message: param ? `${upstream} (${param})` : upstream,
      requestId,
    };
  }
  return { status, code, message: upstream, requestId };
}
