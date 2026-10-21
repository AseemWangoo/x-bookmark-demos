import { z } from "zod";
import { COMPARE_MODEL_ID, llmCostUsd } from "../src/lib/pricing.ts";
import type { FieldResult, FieldSpec, LlmUsage, ModelRun } from "../src/lib/types.ts";
import { scrubSecrets, type Credentials } from "./env.ts";
import { answerFromLlmValue } from "./normalize.ts";
import { HttpError } from "./schema.ts";

const compareModel = () => process.env.COMPARE_MODEL?.trim() || COMPARE_MODEL_ID;

export function llmJsonSchema(fields: FieldSpec[]): Record<string, unknown> {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    shape[field.name] = zodForField(field).describe(fieldDescription(field));
  }
  const schema = z.toJSONSchema(z.object(shape));
  delete schema.$schema;
  return schema;
}

export async function runLlm(
  credentials: Credentials,
  source: string,
  fields: FieldSpec[],
  fetchImpl: typeof fetch = fetch,
): Promise<ModelRun> {
  const model = compareModel();
  const started = performance.now();
  const url = `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/ai/run/${model}`;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "Extract the requested fields from the document. Return only JSON matching the schema. Use null when the document does not determine a value. Numbers are JSON numbers. Dates and times are ISO 8601 strings. Do not include confidence scores or character spans.",
          },
          {
            role: "user",
            content: ["Document:", source, "", "Fields:", ...fields.map(fieldLine)].join("\n"),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: llmJsonSchema(fields),
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    throw new HttpError(
      502,
      scrubSecrets(`LLM request failed: ${message}`, [credentials.token, credentials.accountId]),
    );
  }

  const latencyMs = Math.round(performance.now() - started);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || isFailure(body)) {
    throw new HttpError(
      response.status || 502,
      scrubSecrets(readUpstreamError(response.status, body), [credentials.token, credentials.accountId]),
    );
  }

  const payload = unwrap(body);
  const parsed = parseModelJson(payload.response);
  const answers: Record<string, FieldResult> = {};
  for (const field of fields) {
    answers[field.name] = answerFromLlmValue(field, parsed[field.name]);
  }
  const usage = readUsage(payload.usage);
  return {
    model,
    answers,
    usage,
    latencyMs,
    costUsd: usage ? llmCostUsd(usage.input_tokens, usage.output_tokens) : null,
  };
}

function zodForField(field: FieldSpec): z.ZodType {
  switch (field.type) {
    case "text":
    case "date":
    case "time":
    case "datetime":
      return z.string().nullable();
    case "number":
    case "duration":
      return z.number().nullable();
    case "list":
      return z.array(field.items === "number" ? z.number() : z.string());
    default: {
      const exhaustive: never = field.type;
      return exhaustive;
    }
  }
}

function fieldDescription(field: FieldSpec): string {
  const bits: string[] = [field.type];
  if (field.instructions) bits.push(field.instructions);
  if (field.unit) bits.push(field.unit);
  if (field.decimals !== undefined) bits.push(`${field.decimals} decimals`);
  if (field.items) bits.push(`items ${field.items}`);
  return bits.join(". ");
}

function fieldLine(field: FieldSpec): string {
  const hint = field.instructions ? `: ${field.instructions}` : "";
  return `- ${field.name} (${field.type}${hint})`;
}

function unwrap(body: unknown): { response?: unknown; usage?: unknown } {
  if (!body || typeof body !== "object") return {};
  const record = body as Record<string, unknown>;
  const result = record.result;
  if (result && typeof result === "object") return result as { response?: unknown; usage?: unknown };
  return record as { response?: unknown; usage?: unknown };
}

function parseModelJson(response: unknown): Record<string, unknown> {
  let value = response;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      throw new HttpError(502, "LLM returned non-JSON");
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(502, "LLM JSON was not an object");
  }
  return value as Record<string, unknown>;
}

function isFailure(body: unknown): boolean {
  return Boolean(body && typeof body === "object" && (body as { success?: boolean }).success === false);
}

function readUpstreamError(status: number, body: unknown): string {
  if (body && typeof body === "object" && Array.isArray((body as { errors?: unknown }).errors)) {
    const errors = (body as { errors: Array<{ message?: string }> }).errors;
    const message = errors
      .map((error) => error.message)
      .filter((message): message is string => Boolean(message))
      .join("; ");
    if (message) return `Workers AI ${status}: ${message}`;
  }
  return `Workers AI request failed (${status})`;
}

function readUsage(raw: unknown): LlmUsage | null {
  if (!raw || typeof raw !== "object") return null;
  const usage = raw as Record<string, unknown>;
  const input = usage.prompt_tokens ?? usage.input_tokens;
  const output = usage.completion_tokens ?? usage.output_tokens;
  if (typeof input !== "number") return null;
  return {
    input_tokens: input,
    output_tokens: typeof output === "number" ? output : 0,
  };
}
