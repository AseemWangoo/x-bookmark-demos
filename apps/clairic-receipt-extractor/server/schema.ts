import { z } from "zod";
import { FIELD_TYPES, type ExtractRequest, type FieldSpec } from "../src/lib/types.ts";

const snakeCase = /^[a-z][a-z0-9_]*$/;

export const FieldSpecSchema = z.object({
  name: z.string().regex(snakeCase, "Field name must be snake_case"),
  type: z.enum(FIELD_TYPES),
  instructions: z.string().max(500).optional(),
  decimals: z.number().int().min(0).max(8).optional(),
  unit: z.string().max(32).optional(),
  integer: z.boolean().optional(),
  items: z.enum(["text", "number", "date"]).optional(),
});

export const ExtractRequestSchema = z
  .object({
    source: z.string().min(1, "Source is empty").max(100_000, "Source is too long"),
    fields: z.array(FieldSpecSchema).min(1, "Add at least one field").max(40),
    compare: z.boolean().optional(),
    fixtureId: z.string().optional(),
    forceSample: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const names = new Set<string>();
    value.fields.forEach((field, index) => {
      if (names.has(field.name)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate field ${field.name}`,
          path: ["fields", index, "name"],
        });
      }
      names.add(field.name);
      if (field.type === "list" && !field.items) {
        ctx.addIssue({
          code: "custom",
          message: `List field ${field.name} needs an item type`,
          path: ["fields", index, "items"],
        });
      }
    });
  });

export function parseExtractRequest(input: unknown): ExtractRequest {
  const parsed = ExtractRequestSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new HttpError(400, message);
  }
  return {
    source: parsed.data.source,
    fields: parsed.data.fields satisfies FieldSpec[],
    compare: parsed.data.compare ?? false,
    fixtureId: parsed.data.fixtureId,
    forceSample: parsed.data.forceSample,
  };
}

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
