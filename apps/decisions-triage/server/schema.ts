import { z } from "zod";
import { INBOX } from "../fixtures/messages.ts";
import type { TriageRequest } from "../src/lib/types.ts";

export const MAX_BODY_CHARS = 256_000;
export const MAX_PER_MESSAGE = 50;
export const MAX_PACKED_MESSAGES = 133;

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const usageSchema = z.object({
  input_tokens: z.number(),
  input_tokens_details: z.object({
    cached_tokens: z.number(),
    cache_write_tokens: z.number(),
  }),
  output_tokens: z.number(),
  output_tokens_details: z.object({
    reasoning_tokens: z.number(),
  }),
  total_tokens: z.number(),
});

const predicateAnswerSchema = z.object({
  type: z.literal("predicate"),
  name: z.string().nullable(),
  probability: z.number().min(0).max(1),
});

const choiceAnswerSchema = z.object({
  type: z.literal("choice"),
  name: z.string().nullable(),
  choice: z.union([z.string(), z.boolean()]),
  confidence: z.number().optional(),
  probabilities: z.array(
    z.object({
      value: z.union([z.string(), z.boolean()]),
      probability: z.number(),
    }),
  ),
});

const scoreAnswerSchema = z.object({
  type: z.literal("score"),
  name: z.string().nullable(),
  score: z.number(),
  confidence: z.number().optional(),
  probabilities: z.array(
    z.object({
      value: z.number(),
      label: z.string(),
      probability: z.number(),
    }),
  ),
});

const refusalAnswerSchema = z.object({
  type: z.literal("refusal"),
  name: z.string().nullable(),
});

export const decisionAnswerSchema = z.discriminatedUnion("type", [
  predicateAnswerSchema,
  choiceAnswerSchema,
  scoreAnswerSchema,
  refusalAnswerSchema,
]);

export const decisionResponseSchema = z.object({
  model: z.string(),
  usage: usageSchema,
  answers: z.array(decisionAnswerSchema).min(1),
});

export const responseComparisonSchema = z.object({
  synthetic: z.literal(true),
  id: z.string(),
  latencyMs: z.number(),
  output_text: z.string(),
  usage: usageSchema,
  answer: z.object({
    urgent: z.boolean(),
    route: z.enum(["billing", "bug", "sales", "spam"]),
    priority: z.number().int().min(1).max(5),
  }),
});

export type DecisionAnswer = z.infer<typeof decisionAnswerSchema>;
export type DecisionPayload = z.infer<typeof decisionResponseSchema>;

const triageRequestSchema = z.object({
  messageIds: z.union([z.literal("all"), z.array(z.string().min(1)).min(1)]),
  strategy: z.enum(["per_message", "packed"]),
  compare: z.boolean(),
  forceMock: z.boolean().optional(),
  urgentThreshold: z.number().min(0).max(1).optional(),
});

export function parseTriageRequest(body: unknown): TriageRequest & { messages: typeof INBOX } {
  const parsed = triageRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, "Request body does not match the triage contract");
  }
  const ids = parsed.data.messageIds === "all" ? INBOX.map((message) => message.id) : parsed.data.messageIds;
  const unknown = ids.filter((id) => !INBOX.some((message) => message.id === id));
  if (unknown.length > 0) {
    throw new HttpError(400, `Unknown message id: ${unknown.join(", ")}`);
  }
  const limit = parsed.data.strategy === "packed" ? MAX_PACKED_MESSAGES : MAX_PER_MESSAGE;
  if (ids.length > limit) {
    const questions = ids.length * 3;
    if (parsed.data.strategy === "packed") {
      throw new HttpError(
        400,
        `Packed strategy allows at most 400 questions (${MAX_PACKED_MESSAGES} messages). This request has ${questions} questions.`,
      );
    }
    throw new HttpError(
      400,
      `Per-message strategy allows at most ${MAX_PER_MESSAGE} messages. This request has ${ids.length}.`,
    );
  }
  const messages = ids.map((id) => INBOX.find((message) => message.id === id)!);
  return { ...parsed.data, messageIds: ids, messages };
}

export function assertBodySize(text: string): void {
  if (text.length > MAX_BODY_CHARS) {
    throw new HttpError(413, "Request body is too large");
  }
}
