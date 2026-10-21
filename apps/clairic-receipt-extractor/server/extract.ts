import type { Credentials } from "./env.ts";
import { readCredentials } from "./env.ts";
import { runClairic } from "./clairic.ts";
import { runLlm } from "./llm.ts";
import { sampleExtract } from "./sample.ts";
import { HttpError, parseExtractRequest } from "./schema.ts";
import type { ExtractResponse } from "../src/lib/types.ts";

export type ExtractDeps = {
  readCredentials?: () => Credentials | null;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export async function handleExtract(input: unknown, deps: ExtractDeps = {}): Promise<ExtractResponse> {
  const request = parseExtractRequest(input);
  const read = deps.readCredentials ?? (() => readCredentials());
  const credentials = request.forceSample ? null : read();
  if (!credentials) {
    return sampleExtract(request, deps.sleep);
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const errors: string[] = [];
  let clairic: ExtractResponse["clairic"];
  try {
    clairic = await runClairic(credentials, request.source, request.fields, fetchImpl);
  } catch (error) {
    throw asHttp(error);
  }

  const response: ExtractResponse = { mode: "live", clairic };
  if (request.compare) {
    try {
      response.llm = await runLlm(credentials, request.source, request.fields, fetchImpl);
    } catch (error) {
      errors.push(asHttp(error).message);
    }
  }
  if (errors.length > 0) response.errors = errors;
  return response;
}

export function handleMode(read: () => Credentials | null = () => readCredentials()): {
  mode: "sample" | "live";
} {
  return { mode: read() ? "live" : "sample" };
}

function asHttp(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  const message = error instanceof Error ? error.message : "Extraction failed";
  return new HttpError(500, message);
}
