import OpenAI from "openai";

import { BOARD_JSON_SCHEMA, parseBoard } from "../../shared/schema.ts";
import type { Effort } from "../../shared/schema.ts";
import type { ExtractRequest, ExtractResult, ProviderId, Usage } from "../../shared/types.ts";
import { quoteCost, usageFromPayload } from "../cost.ts";
import { defaultProvider, isConfigured } from "../env.ts";
import { SYSTEM_PROMPT, buildUserContent, stripJsonFence } from "../prompt.ts";
import { customCall } from "./custom.ts";
import { openrouterCall } from "./openrouter.ts";
import { tokenhubCall, type ProviderCall } from "./tokenhub.ts";
import type { ExtractAdapter } from "./types.ts";
import { ExtractError } from "./types.ts";

type FormatKind = "json_schema" | "json_object" | "fenced";

const schemaFormat = {
  type: "json_schema" as const,
  json_schema: {
    name: "whiteboard_task_board",
    description: "Tasks and open questions grounded in the images or the numbered thread.",
    schema: BOARD_JSON_SCHEMA,
    strict: true,
  },
};

const jsonObjectFormat = { type: "json_object" as const };

export function callFor(provider: ProviderId, env: NodeJS.ProcessEnv, effort: Effort): ProviderCall {
  switch (provider) {
    case "tokenhub":
      return tokenhubCall(env, effort);
    case "openrouter":
      return openrouterCall(env, effort);
    case "custom":
      return customCall(env, effort);
    default: {
      const unknown: never = provider;
      throw new Error(`Unknown provider ${String(unknown)}`);
    }
  }
}

function safeMessage(message: string): string {
  return message
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 300);
}

function isSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  const status = error instanceof OpenAI.APIError ? error.status : 0;
  if (status !== 400 && status !== 422 && status !== 0) return false;
  return /response_format|json_schema|structured|invalid schema/i.test(message);
}

function isStreamUnsupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  const status = error instanceof OpenAI.APIError ? error.status : 0;
  if (status !== 400 && status !== 422) return false;
  return /stream/i.test(message) && /not support|unsupported|unrecognized|unknown|invalid/i.test(message);
}

type Completion = {
  text: string;
  ttftMs: number | null;
  latencyMs: number;
  usage: unknown;
};

function responseFormat(kind: FormatKind): Record<string, unknown> | undefined {
  switch (kind) {
    case "json_schema":
      return schemaFormat;
    case "json_object":
      return jsonObjectFormat;
    case "fenced":
      return undefined;
    default: {
      const unknown: never = kind;
      throw new Error(`Unknown format ${String(unknown)}`);
    }
  }
}

async function readStream(stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>, started: number): Promise<Completion> {
  let ttftMs: number | null = null;
  let text = "";
  let usage: unknown;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta as { content?: string | null; reasoning_content?: string | null } | undefined;
    const content = delta?.content ?? "";
    const reasoning = delta?.reasoning_content ?? "";
    if ((content || reasoning) && ttftMs === null) ttftMs = Math.round(performance.now() - started);
    text += content;
    if (chunk.usage) usage = chunk.usage;
  }
  return { text, ttftMs, latencyMs: Math.round(performance.now() - started), usage };
}

async function complete(client: OpenAI, call: ProviderCall, request: ExtractRequest, kind: FormatKind, stream: boolean): Promise<Completion> {
  const started = performance.now();
  const format = responseFormat(kind);
  const body: Record<string, unknown> = {
    model: call.model,
    temperature: call.temperature,
    top_p: call.topP,
    max_tokens: 4096,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserContent(request.text, request.images) },
    ],
    stream,
    ...call.extra,
  };
  if (stream) body.stream_options = { include_usage: true };
  if (format) body.response_format = format;
  // `no_think` and `thinking` are outside the pinned SDK's ReasoningEffort union. The cast keeps them on the wire.
  const params = body as unknown as OpenAI.Chat.ChatCompletionCreateParamsStreaming;
  if (stream) {
    const completion = await client.chat.completions.create(params);
    return readStream(completion, started);
  }
  const completion = await client.chat.completions.create({
    ...params,
    stream: false,
  });
  const message = completion.choices[0]?.message as { content?: string | null } | undefined;
  return {
    text: message?.content ?? "",
    ttftMs: null,
    latencyMs: Math.round(performance.now() - started),
    usage: completion.usage,
  };
}

async function completeTolerant(
  client: OpenAI,
  call: ProviderCall,
  request: ExtractRequest,
  kind: FormatKind,
): Promise<Completion> {
  try {
    return await complete(client, call, request, kind, true);
  } catch (error) {
    if (!isStreamUnsupported(error)) throw error;
    return complete(client, call, request, kind, false);
  }
}

function toUsage(completion: Completion, request: ExtractRequest): Usage {
  return usageFromPayload(completion.usage, request.text, request.images.length);
}

export function createLiveAdapter(env: NodeJS.ProcessEnv = process.env): ExtractAdapter {
  return {
    mode: "live",
    async run(request) {
      const provider = request.provider ?? defaultProvider(env);
      if (!provider || !isConfigured(provider, env)) {
        throw new ExtractError("That provider is not configured on the server.", 400);
      }
      let call: ProviderCall;
      try {
        call = callFor(provider, env, request.effort);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Provider is not configured.";
        throw new ExtractError(message, 400);
      }
      const client = new OpenAI({
        apiKey: call.apiKey,
        baseURL: call.baseURL,
        timeout: 120_000,
        maxRetries: 0,
        defaultHeaders: call.headers,
      });
      const order: FormatKind[] = ["json_schema", "json_object", "fenced"];
      let lastError: unknown;
      for (const kind of order) {
        try {
          const completion = await completeTolerant(client, call, request, kind);
          if (!completion.text.trim()) {
            throw new ExtractError("Hy4 flash returned an empty completion.", 502);
          }
          let parsedJson: unknown;
          try {
            parsedJson = JSON.parse(stripJsonFence(completion.text));
          } catch {
            throw new ExtractError("Hy4 flash did not return JSON.", 502);
          }
          const board = parseBoard(parsedJson);
          if (!board.ok) throw new ExtractError(board.error, 502);
          const usage = toUsage(completion, request);
          const result: ExtractResult = {
            board: board.board,
            latencyMs: completion.latencyMs,
            ttftMs: completion.ttftMs,
            usage,
            cost: quoteCost(provider, usage),
            source: "live",
            provider,
            model: call.model,
            effort: request.effort,
            outputMode: kind,
            timingsNote: completion.ttftMs === null ? "TTFT unavailable because the response was not streamed." : null,
          };
          return result;
        } catch (error) {
          lastError = error;
          if (error instanceof ExtractError && error.status === 502 && kind !== "fenced") continue;
          if (isSchemaError(error) && kind !== "fenced") continue;
          break;
        }
      }
      if (lastError instanceof ExtractError) throw lastError;
      if (lastError instanceof OpenAI.APIError) {
        const status = lastError.status === 401 || lastError.status === 403 ? lastError.status : 502;
        throw new ExtractError(`Hy4 flash request failed (${lastError.status}). ${safeMessage(lastError.message)}`, status);
      }
      if (lastError instanceof Error && lastError.name === "AbortError") {
        throw new ExtractError("Hy4 flash request timed out.", 504);
      }
      const message = lastError instanceof Error ? safeMessage(lastError.message) : "Hy4 flash request failed.";
      throw new ExtractError(message || "Hy4 flash request failed.", 502);
    },
  };
}
