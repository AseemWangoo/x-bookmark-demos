import OpenAI from "openai";
import type { TriageError } from "../src/lib/types.ts";
import { redact } from "./env.ts";

export function errorParts(error: unknown, secret: string | null): { status?: number; message: string } {
  if (error instanceof OpenAI.APIError) {
    return { status: error.status, message: redact(error.message, secret) };
  }
  if (error instanceof Error) {
    const status = "status" in error && typeof error.status === "number" ? error.status : undefined;
    return { status, message: redact(error.message, secret) };
  }
  return { message: "Request failed" };
}

export function triageError(
  error: unknown,
  source: TriageError["source"],
  secret: string | null,
  id?: string,
): TriageError {
  const parts = errorParts(error, secret);
  return { id, source, status: parts.status, message: parts.message };
}
