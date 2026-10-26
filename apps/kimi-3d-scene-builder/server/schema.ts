import { z } from "zod";
import type { TurnRequest } from "../src/lib/types.ts";
import { readEnv } from "./env.ts";

export const MAX_PROMPT_CHARS = 2000;
export const MAX_CODE_CHARS = 64 * 1024;

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const errorSchema = z.object({
  phase: z.enum(["compile", "build", "frame", "timeout", "blocked"]),
  message: z.string().min(1).max(4000),
  line: z.number().int().positive().optional(),
});

const turnSchema = z.object({
  kind: z.enum(["generate", "edit", "fix"]),
  prompt: z.string().min(1).max(MAX_PROMPT_CHARS),
  currentCode: z.string().max(MAX_CODE_CHARS).optional(),
  error: errorSchema.optional(),
  model: z.enum(["pro", "highspeed"]),
  effort: z.enum(["low", "high", "max"]).optional(),
  forceMock: z.boolean().optional(),
});

export function parseTurnRequest(body: unknown): TurnRequest {
  const parsed = turnSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request");
  }
  const request = parsed.data;
  if ((request.kind === "edit" || request.kind === "fix") && !request.currentCode) {
    throw new HttpError(400, "currentCode is required for edit and fix");
  }
  if (request.kind === "fix" && !request.error) {
    throw new HttpError(400, "error is required for fix");
  }
  if (request.currentCode && new TextEncoder().encode(request.currentCode).length > MAX_CODE_CHARS) {
    throw new HttpError(400, "currentCode exceeds 64 KB");
  }
  return {
    ...request,
    effort: request.effort ?? readEnv().defaultEffort,
  };
}
