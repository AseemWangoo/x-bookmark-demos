import { CLAIRIC_MODEL_ID, clairicCostUsd } from "../src/lib/pricing.ts";
import type { ClairicUsage, FieldResult, FieldSpec, ModelRun } from "../src/lib/types.ts";
import { scrubSecrets, type Credentials } from "./env.ts";
import { HttpError } from "./schema.ts";
import { parseAnswer } from "./normalize.ts";

export function clairicFields(fields: FieldSpec[]): Record<string, Record<string, unknown>> {
  const payload: Record<string, Record<string, unknown>> = {};
  for (const field of fields) {
    const spec: Record<string, unknown> = { type: field.type };
    if (field.instructions) spec.instructions = field.instructions;
    switch (field.type) {
      case "text":
      case "date":
      case "time":
      case "datetime":
        break;
      case "number":
        if (field.decimals !== undefined) spec.decimals = field.decimals;
        if (field.unit) spec.unit = field.unit;
        if (field.integer !== undefined) spec.integer = field.integer;
        break;
      case "duration":
        if (field.unit) spec.unit = field.unit;
        if (field.integer !== undefined) spec.integer = field.integer;
        break;
      case "list":
        spec.items = field.items ?? "text";
        break;
      default: {
        const exhaustive: never = field.type;
        throw new Error(`Unhandled field type ${exhaustive}`);
      }
    }
    payload[field.name] = spec;
  }
  return payload;
}

export async function runClairic(
  credentials: Credentials,
  source: string,
  fields: FieldSpec[],
  fetchImpl: typeof fetch = fetch,
): Promise<ModelRun> {
  const started = performance.now();
  const url = `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/ai/run/${CLAIRIC_MODEL_ID}`;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "clairic",
        state: source,
        fields: clairicFields(fields),
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    throw new HttpError(502, scrubSecrets(`Clairic request failed: ${message}`, [credentials.token, credentials.accountId]));
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
  const rawAnswers = payload.answers ?? {};
  const answers: Record<string, FieldResult> = {};
  for (const field of fields) {
    if (!(field.name in rawAnswers)) {
      throw new HttpError(502, `Clairic response missing ${field.name}`);
    }
    answers[field.name] = parseAnswer(rawAnswers[field.name]);
  }
  const usage = readUsage(payload.usage);
  return {
    model: typeof payload.model === "string" ? payload.model : "clairic",
    answers,
    usage,
    latencyMs,
    costUsd: usage ? clairicCostUsd(usage.input_tokens) : null,
    truncated: payload.truncated === true,
  };
}

function unwrap(body: unknown): {
  model?: string;
  answers?: Record<string, unknown>;
  usage?: unknown;
  truncated?: boolean;
} {
  if (!body || typeof body !== "object") return {};
  const record = body as Record<string, unknown>;
  const result = record.result;
  if (result && typeof result === "object") return result as ReturnType<typeof unwrap>;
  return record as ReturnType<typeof unwrap>;
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

function readUsage(raw: unknown): ClairicUsage | null {
  if (!raw || typeof raw !== "object") return null;
  const usage = raw as Record<string, unknown>;
  if (typeof usage.input_tokens !== "number") return null;
  return {
    state_tokens: typeof usage.state_tokens === "number" ? usage.state_tokens : 0,
    image_tokens: typeof usage.image_tokens === "number" ? usage.image_tokens : 0,
    schema_tokens: typeof usage.schema_tokens === "number" ? usage.schema_tokens : 0,
    input_tokens: usage.input_tokens,
    output_tokens: typeof usage.output_tokens === "number" ? usage.output_tokens : 0,
    passes: typeof usage.passes === "number" ? usage.passes : 1,
  };
}
