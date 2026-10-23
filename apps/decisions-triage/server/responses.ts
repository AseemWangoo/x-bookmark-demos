import OpenAI from "openai";
import { z } from "zod";
import type { InboxMessage, NormalizedAnswers } from "../src/lib/types.ts";
import type { ReasoningEffort } from "./env.ts";
import { levelLabelForScore, PRIORITY_LEVELS, ROUTE_CHOICES, TRIAGE_QUESTIONS } from "./questions.ts";
import { renderMessage } from "./render.ts";

/**
 * Comparison adapter for POST /v1/responses.
 * Structured output uses text.format = { type: "json_schema", name, schema, strict }.
 * https://developers.openai.com/api/docs/models/gpt-6-luna
 * The Responses API does not return probabilities. Those fields stay null.
 */

export const triageJsonSchema = z.object({
  urgent: z.boolean(),
  route: z.enum(["billing", "bug", "sales", "spam"]),
  priority: z.number().int().min(1).max(5),
});

export type ResponsesRequest = {
  model: string;
  input: string;
  reasoning: { effort: ReasoningEffort };
  text: {
    format: {
      type: "json_schema";
      name: string;
      schema: Record<string, unknown>;
      strict: true;
    };
  };
};

export type ResponsesPayload = {
  output_text?: string;
  usage?: {
    input_tokens: number;
    input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
    output_tokens: number;
    output_tokens_details?: { reasoning_tokens?: number };
    total_tokens: number;
  };
};

export type ResponsesClient = {
  responses?: {
    create: (body: ResponsesRequest) => Promise<ResponsesPayload> & {
      withResponse?: () => Promise<{ data: ResponsesPayload; response: Response }>;
    };
  };
  post?: (path: string, opts: { body: unknown }) => Promise<unknown>;
  apiKey?: string;
  baseURL?: string;
};

export function responsesFormatSchema(): Record<string, unknown> {
  const generated = triageJsonSchema.toJSONSchema() as Record<string, unknown>;
  const rest = { ...generated };
  delete rest.$schema;
  return {
    ...rest,
    additionalProperties: false,
  };
}

function comparisonPrompt(): string {
  const routes = ROUTE_CHOICES.map((choice) => `- ${choice.value}: ${choice.description}`).join("\n");
  const levels = PRIORITY_LEVELS.map((level, index) => `- ${index + 1} ${level.label}: ${level.description}`).join(
    "\n",
  );
  return [
    TRIAGE_QUESTIONS.urgent.instructions,
    TRIAGE_QUESTIONS.route.instructions,
    routes,
    TRIAGE_QUESTIONS.priority.instructions,
    levels,
    "Reply with JSON only: urgent (boolean), route (billing, bug, sales, or spam), priority (integer 1 through 5).",
  ].join("\n");
}

export function buildResponsesRequest(
  message: InboxMessage,
  effort: ReasoningEffort,
  model = "gpt-6-luna",
): ResponsesRequest {
  return {
    model,
    reasoning: { effort },
    input: `${comparisonPrompt()}\n\n${renderMessage(message)}`,
    text: {
      format: {
        type: "json_schema",
        name: "inbox_triage",
        schema: responsesFormatSchema(),
        strict: true,
      },
    },
  };
}

function logProcessingHeader(response: Response): void {
  const value = response.headers.get("openai-processing-ms");
  if (value) console.info(`responses openai-processing-ms=${value}`);
}

export async function callResponses(
  client: ResponsesClient,
  body: ResponsesRequest,
): Promise<{ raw: ResponsesPayload; latencyMs: number }> {
  const started = performance.now();
  const raw = await invokeResponses(client, body);
  return { raw, latencyMs: performance.now() - started };
}

async function invokeResponses(client: ResponsesClient, body: ResponsesRequest): Promise<ResponsesPayload> {
  const create = client.responses?.create;
  if (create) {
    const pending = create(body);
    if (typeof pending.withResponse === "function") {
      const { data, response } = await pending.withResponse();
      logProcessingHeader(response);
      return data;
    }
    return pending;
  }
  if (typeof client.post === "function") {
    return (await client.post("/responses", { body })) as ResponsesPayload;
  }
  const apiKey = client.apiKey;
  if (!apiKey) throw new Error("Missing API key for the Responses request");
  const baseURL = (client.baseURL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseURL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  logProcessingHeader(response);
  if (!response.ok) {
    const text = (await response.text()).slice(0, 500);
    const error = new Error(text || `Responses request failed (${response.status})`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return (await response.json()) as ResponsesPayload;
}

export function normalizeResponse(outputText: string): NormalizedAnswers {
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("Responses output_text was not JSON");
  }
  const answer = triageJsonSchema.parse(parsed);
  return {
    urgent: { probability: null, value: answer.urgent, refused: false, unrecognised: false },
    route: { choice: answer.route, confidence: null, probabilities: null, refused: false, unrecognised: false },
    priority: {
      score: answer.priority,
      level: levelLabelForScore(answer.priority),
      confidence: null,
      probabilities: null,
      refused: false,
      unrecognised: false,
    },
  };
}

export function asResponsesClient(client: OpenAI): ResponsesClient {
  return client as unknown as ResponsesClient;
}
