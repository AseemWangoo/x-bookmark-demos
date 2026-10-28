import { z } from "zod";

export const askBody = z.object({
  text: z.string().trim().min(1).max(4_000),
});

export const vendorInput = z.object({
  name: z.string(),
  email: z.string(),
  category: z.string(),
  terms: z.string(),
});

export const callBody = z.object({
  integration: z.literal("add_vendor"),
  input: vendorInput,
  idempotency_key: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,200}$/)
    .optional(),
});

export const replayFixture = z.object({
  recordedAt: z.string().nullable(),
  pomeradoVersion: z.string().nullable(),
  synthetic: z.boolean(),
  integration: z.enum(["list_invoices", "list_vendors", "add_vendor"]),
  input: z.record(z.string(), z.unknown()),
  arguments: z.object({
    input: z.unknown(),
    idempotency_key: z.string().optional(),
  }),
  trail: z.array(z.string()),
  output: z.unknown(),
  coldMs: z.number(),
  warmMs: z.number(),
});

export type ReplayFixture = z.infer<typeof replayFixture>;
