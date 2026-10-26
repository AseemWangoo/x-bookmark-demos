import OpenAI from "openai";
import type { Effort, ModelChoice, NormalizedUsage } from "../src/lib/types.ts";
import type { ChatMessage } from "./prompt.ts";

// Model ids: https://platform.kimi.ai/docs/api/models-overview (checked 2026-10-26).
export const KIMI_MODELS = {
  pro: "kimi-k3.1-pro",
  highspeed: "kimi-k3.1-pro-highspeed",
} as const;

// Global Chat Completions base URL. https://platform.kimi.ai/docs/api/overview
// The China host was not verified. Override it with MOONSHOT_BASE_URL.
export const DEFAULT_BASE_URL = "https://api.moonshot.ai/v1";

let constructions = 0;

export function createKimiClient(apiKey: string, baseURL: string): OpenAI {
  constructions += 1;
  return new OpenAI({ apiKey, baseURL });
}

export function openaiConstructionCount(): number {
  return constructions;
}

export function resetOpenAIConstructionCount(): void {
  constructions = 0;
}

export type ChatRequestBody = {
  model: string;
  messages: ChatMessage[];
  reasoning_effort: Effort;
  max_completion_tokens: number;
  stream: true;
  stream_options: { include_usage: true };
};

// https://platform.kimi.ai/docs/api/chat
// Fixed sampling params are omitted: temperature, top_p, n, penalties. Do not send `thinking`.
// reasoning_effort "max" may be outside the OpenAI SDK enum; the cast stays at this boundary.
export function buildChatRequest(input: {
  model: ModelChoice;
  effort: Effort;
  messages: ChatMessage[];
  maxCompletionTokens: number;
}): ChatRequestBody {
  return {
    model: KIMI_MODELS[input.model],
    messages: input.messages,
    reasoning_effort: input.effort,
    max_completion_tokens: input.maxCompletionTokens,
    stream: true,
    stream_options: { include_usage: true },
  };
}

// https://platform.kimi.ai/docs/api/chat — usage object.
// cached_tokens may be absent; missing detail fields count as 0.
export type RawUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
  prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
};

export function normalizeUsage(raw: RawUsage | null | undefined): NormalizedUsage {
  const prompt = raw?.prompt_tokens ?? 0;
  const cached = raw?.prompt_tokens_details?.cached_tokens ?? 0;
  const cacheWrite = raw?.prompt_tokens_details?.cache_write_tokens ?? 0;
  const completion = raw?.completion_tokens ?? 0;
  const reasoning = raw?.completion_tokens_details?.reasoning_tokens ?? 0;
  const uncached = Math.max(0, prompt - cached - cacheWrite);
  const total = raw?.total_tokens ?? prompt + completion;
  return { prompt, cached, cacheWrite, uncached, completion, reasoning, total };
}

type KimiDelta = {
  content?: string | null;
  reasoning_content?: string | null;
};

type KimiChoice = {
  delta?: KimiDelta;
  finish_reason?: string | null;
  usage?: RawUsage | null;
};

type KimiChunk = {
  choices?: KimiChoice[];
  usage?: RawUsage | null;
};

export type StreamFold = {
  reasoning: string;
  content: string;
  usage: NormalizedUsage;
  finishReason: string | null;
  ttftMs: number | null;
  firstContentMs: number | null;
  totalMs: number;
  incomplete: boolean;
};

export type TokenEvent = { type: "reasoning" | "content"; text: string };

export async function streamChat(
  client: OpenAI,
  body: ChatRequestBody,
  onEvent: (event: TokenEvent) => void,
  now: () => number = () => performance.now(),
): Promise<StreamFold> {
  const started = now();
  // reasoning_content is not in the SDK types. The docs say to read it off delta anyway.
  // https://platform.kimi.ai/docs/guide/utilize-the-streaming-output-feature-of-kimi-api
  const stream = await client.chat.completions.create(
    body as unknown as OpenAI.ChatCompletionCreateParamsStreaming,
  );
  let reasoning = "";
  let content = "";
  let usageRaw: RawUsage | undefined;
  let finishReason: string | null = null;
  let ttftMs: number | null = null;
  let firstContentMs: number | null = null;

  for await (const rawChunk of stream) {
    const chunk = rawChunk as KimiChunk;
    const folded = foldChunk(chunk);
    if (folded.reasoning) {
      if (ttftMs === null) ttftMs = now() - started;
      reasoning += folded.reasoning;
      onEvent({ type: "reasoning", text: folded.reasoning });
    }
    if (folded.content) {
      if (ttftMs === null) ttftMs = now() - started;
      if (firstContentMs === null) firstContentMs = now() - started;
      content += folded.content;
      onEvent({ type: "content", text: folded.content });
    }
    if (folded.finishReason) finishReason = folded.finishReason;
    if (folded.usage) usageRaw = folded.usage;
  }

  return {
    reasoning,
    content,
    usage: normalizeUsage(usageRaw),
    finishReason,
    ttftMs,
    firstContentMs,
    totalMs: now() - started,
    // The SDK iterator ends after the documented `data: [DONE]` line.
    incomplete: false,
  };
}

export type ParsedSse = {
  reasoning: string;
  content: string;
  usage: NormalizedUsage;
  finishReason: string | null;
  incomplete: boolean;
};

// Fallback parser for a raw SSE body when the SDK stream is not available.
// https://platform.kimi.ai/docs/guide/utilize-the-streaming-output-feature-of-kimi-api
export function parseSseText(text: string): ParsedSse {
  let reasoning = "";
  let content = "";
  let usageRaw: RawUsage | undefined;
  let finishReason: string | null = null;
  let sawDone = false;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (data === "[DONE]") {
      sawDone = true;
      continue;
    }
    if (!data.startsWith("{")) continue;
    let chunk: KimiChunk;
    try {
      chunk = JSON.parse(data) as KimiChunk;
    } catch {
      continue;
    }
    const folded = foldChunk(chunk);
    reasoning += folded.reasoning;
    content += folded.content;
    if (folded.finishReason) finishReason = folded.finishReason;
    if (folded.usage) usageRaw = folded.usage;
  }

  return {
    reasoning,
    content,
    usage: normalizeUsage(usageRaw),
    finishReason,
    incomplete: !sawDone,
  };
}

function foldChunk(chunk: KimiChunk): {
  reasoning: string;
  content: string;
  finishReason: string | null;
  usage?: RawUsage;
} {
  const choice = chunk.choices?.[0];
  const reasoning = choice?.delta?.reasoning_content ?? "";
  const content = choice?.delta?.content ?? "";
  const finishReason = typeof choice?.finish_reason === "string" ? choice.finish_reason : null;
  const usage = chunk.usage ?? choice?.usage ?? undefined;
  return { reasoning, content, finishReason, usage: usage ?? undefined };
}

export function mapKimiError(status: number | undefined, errorType: string | undefined, message: string): string {
  if (status === 401) return "bad or mismatched key (platform.kimi.ai vs platform.kimi.com)";
  if (status === 404 || errorType === "resource_not_found_error") {
    return "model not available on this account (K3.1 Pro needs a $1 top-up)";
  }
  if (status === 429 || errorType === "rate_limit_reached_error") return "rate limited";
  return message || "Kimi request failed";
}

export function describeKimiFailure(error: unknown): {
  status?: number;
  errorType?: string;
  message: string;
} {
  const record = error && typeof error === "object" ? (error as { status?: unknown; error?: { type?: unknown }; type?: unknown; message?: unknown }) : {};
  const status = typeof record.status === "number" ? record.status : undefined;
  const nestedType = record.error && typeof record.error === "object" ? record.error.type : undefined;
  const errorType = typeof nestedType === "string" ? nestedType : typeof record.type === "string" ? record.type : undefined;
  const message = typeof record.message === "string" ? record.message : "Kimi request failed";
  return { status, errorType, message: mapKimiError(status, errorType, message) };
}
