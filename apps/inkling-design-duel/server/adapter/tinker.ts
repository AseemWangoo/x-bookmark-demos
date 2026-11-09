import OpenAI from "openai";

import { costUsd, estimateTokens } from "../cost.ts";
import { extractHtml } from "../html.ts";
import { parseImageDataUrl, type SketchImage } from "../image.ts";
import { HTML_SYSTEM_PROMPT } from "../prompts.ts";
import {
  ANTHROPIC_BASE_URL,
  OPENAI_BASE_URL,
  effortValue,
  type EffortName,
  type GenerationResult,
  type TokenUsage,
  type Transport,
} from "../../shared/duel.ts";
import { modelCandidates } from "./models.ts";
import type { DesignAdapter, GenerationRequest } from "./types.ts";

/** Anthropic Messages requires max_tokens. Docs examples use 512 and 1024; a page needs more room. */
export const ANTHROPIC_MAX_TOKENS = 4096;

/** Header the official Anthropic SDK sends. Tinker documents that those SDKs work against this base URL. */
const ANTHROPIC_VERSION = "2023-06-01";

const REQUEST_TIMEOUT_MS = 120_000;

type RawSample = {
  content: string;
  reasoning?: string;
  usage: TokenUsage;
};

export function createTinkerAdapter(env: NodeJS.ProcessEnv = process.env): DesignAdapter {
  const apiKey = env.TINKER_API_KEY?.trim();
  if (!apiKey) throw new Error("TINKER_API_KEY is required for live mode.");
  const client = new OpenAI({
    apiKey,
    baseURL: env.TINKER_BASE_URL?.trim() || OPENAI_BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });
  return {
    mode: "live",
    generate(request) {
      return generateLive(client, apiKey, env, request);
    },
  };
}

export function buildOpenAIBody(request: GenerationRequest, model: string): Record<string, unknown> {
  return {
    model,
    messages: [
      { role: "system", content: HTML_SYSTEM_PROMPT },
      { role: "user", content: openAIUserContent(request) },
    ],
    reasoning_effort: effortValue(request.effort),
    separate_reasoning: true,
  };
}

export function buildAnthropicBody(request: GenerationRequest, model: string): Record<string, unknown> {
  return {
    model,
    max_tokens: ANTHROPIC_MAX_TOKENS,
    system: HTML_SYSTEM_PROMPT,
    messages: [{ role: "user", content: anthropicUserContent(request) }],
    output_config: { effort: anthropicEffort(request.effort) },
  };
}

export function anthropicMessagesUrl(base = ANTHROPIC_BASE_URL): string {
  return `${base.replace(/\/$/, "")}/v1/messages`;
}

function openAIUserContent(request: GenerationRequest): string | Array<Record<string, unknown>> {
  if (!request.imageDataUrl) return request.prompt;
  const image = requireSketch(request.imageDataUrl);
  return [
    { type: "text", text: request.prompt },
    { type: "image_url", image_url: { url: `data:${image.mediaType};base64,${image.data}` } },
  ];
}

function anthropicUserContent(request: GenerationRequest): string | Array<Record<string, unknown>> {
  if (!request.imageDataUrl) return request.prompt;
  const image = requireSketch(request.imageDataUrl);
  return [
    { type: "text", text: request.prompt },
    {
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.data },
    },
  ];
}

function requireSketch(dataUrl: string): SketchImage {
  const image = parseImageDataUrl(dataUrl);
  if (!image) throw new Error("Sketch must be a PNG or JPEG data URI.");
  return image;
}

function anthropicEffort(effort: EffortName): "low" | "high" {
  switch (effort) {
    case "low":
    case "high":
      return effort;
    default: {
      const unreachable: never = effort;
      return unreachable;
    }
  }
}

async function generateLive(
  client: OpenAI,
  apiKey: string,
  env: NodeJS.ProcessEnv,
  request: GenerationRequest,
): Promise<GenerationResult> {
  const started = performance.now();
  const models = modelCandidates({ TINKER_MODEL: env.TINKER_MODEL });
  const openAIErrors: string[] = [];
  for (const model of models) {
    try {
      const raw = await openAIChat(client, request, model);
      return toResult(raw, request, started, "openai", model);
    } catch (error) {
      openAIErrors.push(`${model}: ${publicError(error, apiKey)}`);
    }
  }

  const anthropicErrors: string[] = [];
  for (const model of models) {
    try {
      const raw = await anthropicMessages(apiKey, request, model);
      return toResult(raw, request, started, "anthropic", model);
    } catch (error) {
      anthropicErrors.push(`${model}: ${publicError(error, apiKey)}`);
    }
  }

  throw new Error(
    [
      `Tinker request failed for ${request.effort} effort (${effortValue(request.effort)}).`,
      "OpenAI-compatible:",
      ...openAIErrors,
      "Anthropic-compatible:",
      ...anthropicErrors,
    ].join("\n"),
  );
}

async function openAIChat(client: OpenAI, request: GenerationRequest, model: string): Promise<RawSample> {
  const body = buildOpenAIBody(request, model);
  const completion = await client.chat.completions.create(
    body as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
  );
  const message = completion.choices[0]?.message;
  const content = message?.content?.trim() ?? "";
  if (!content) throw new Error("OpenAI-compatible response had no message content.");
  return {
    content,
    reasoning: readReasoning(message),
    usage: readOpenAIUsage(completion.usage, request.prompt, content),
  };
}

function readReasoning(message: OpenAI.Chat.ChatCompletionMessage | undefined): string | undefined {
  if (!message) return undefined;
  const extra = message as OpenAI.Chat.ChatCompletionMessage & { reasoning_content?: unknown };
  if (typeof extra.reasoning_content !== "string") return undefined;
  const trimmed = extra.reasoning_content.trim();
  return trimmed || undefined;
}

function readOpenAIUsage(
  usage: OpenAI.Completions.CompletionUsage | undefined,
  prompt: string,
  content: string,
): TokenUsage {
  if (!usage || typeof usage.prompt_tokens !== "number" || typeof usage.completion_tokens !== "number") {
    return estimateUsage(prompt, content);
  }
  const cached = usage.prompt_tokens_details?.cached_tokens;
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    cachedPromptTokens: typeof cached === "number" ? cached : 0,
    estimated: false,
  };
}

type AnthropicMessage = {
  content?: Array<{ type?: string; text?: string; thinking?: string }>;
  usage?: { input_tokens?: number | null; output_tokens?: number | null };
};

async function anthropicMessages(apiKey: string, request: GenerationRequest, model: string): Promise<RawSample> {
  const response = await fetch(anthropicMessagesUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify(buildAnthropicBody(request, model)),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${clip(text)}`);
  let parsed: AnthropicMessage;
  try {
    parsed = JSON.parse(text) as AnthropicMessage;
  } catch {
    throw new Error("Anthropic-compatible response was not JSON.");
  }
  const blocks = parsed.content ?? [];
  const content = blocks
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();
  if (!content) throw new Error("Anthropic-compatible response had no text block.");
  const thinking = blocks
    .filter((block) => block.type === "thinking")
    .map((block) => block.thinking ?? "")
    .join("\n")
    .trim();
  return {
    content,
    reasoning: thinking || undefined,
    usage: readAnthropicUsage(parsed.usage, request.prompt, content),
  };
}

function readAnthropicUsage(
  usage: AnthropicMessage["usage"],
  prompt: string,
  content: string,
): TokenUsage {
  const input = usage?.input_tokens;
  const output = usage?.output_tokens;
  if (typeof input !== "number" || typeof output !== "number") return estimateUsage(prompt, content);
  return {
    promptTokens: input,
    completionTokens: output,
    cachedPromptTokens: 0,
    estimated: false,
  };
}

function estimateUsage(prompt: string, content: string): TokenUsage {
  return {
    promptTokens: estimateTokens(`${HTML_SYSTEM_PROMPT}\n${prompt}`),
    completionTokens: estimateTokens(content),
    cachedPromptTokens: 0,
    estimated: true,
  };
}

function toResult(
  raw: RawSample,
  request: GenerationRequest,
  started: number,
  transport: Transport,
  model: string,
): GenerationResult {
  const html = extractHtml(raw.content);
  if (!html) throw new Error(`${transport} response did not include HTML.`);
  return {
    html,
    reasoning: raw.reasoning,
    latencyMs: Math.max(0, Math.round(performance.now() - started)),
    usage: raw.usage,
    costUsd: costUsd(raw.usage),
    source: "live",
    effort: request.effort,
    effortValue: effortValue(request.effort),
    model,
    transport,
  };
}

function publicError(error: unknown, apiKey: string): string {
  const raw = error instanceof Error ? error.message : "Request failed.";
  return clip(raw.split(apiKey).join("[redacted]"));
}

function clip(text: string): string {
  return text.replace(/\s+/g, " ").slice(0, 300);
}
