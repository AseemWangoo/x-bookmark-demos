import { generateText } from "ai";

import type { Effort, PortRequest, PortResult } from "../../shared/port.ts";
import { DEFAULT_MODEL } from "../../shared/port.ts";
import { costUsd } from "../cost.ts";
import { extractHtml } from "../html.ts";
import { buildPrompt, PORT_INSTRUCTIONS } from "../prompts.ts";
import { normalizeUsage } from "../usage.ts";
import type { PortAdapter } from "./types.ts";

export const MAX_OUTPUT_TOKENS = 65_536;
export const GATEWAY_TIMEOUT_MS = 15 * 60 * 1000;

const THINKING_REJECTION =
  /thinkingConfig|thinking_level|thinkingLevel|thinking level|includeThoughts|include_thoughts/i;

type GatewayProvider = "google" | "vertex";

export type GatewayCall = {
  model: string;
  instructions: string;
  prompt: string;
  maxOutputTokens: number;
  timeout: number;
  providerOptions: Record<
    string,
    {
      thinkingConfig: {
        thinkingLevel: Effort;
        includeThoughts: true;
      };
    }
  >;
};

export type GatewayReply = {
  text: string;
  usage: unknown;
  reasoningText?: string;
  warnings?: unknown;
};

export type GatewayClient = (options: GatewayCall) => Promise<GatewayReply>;

type Env = Record<string, string | undefined>;

export function resolveGatewayModel(env: Env): string {
  const configured = env.AI_GATEWAY_MODEL?.trim();
  return configured || DEFAULT_MODEL;
}

export function buildGatewayCall(
  request: PortRequest,
  provider: GatewayProvider,
  model: string,
): GatewayCall {
  return {
    model,
    instructions: PORT_INSTRUCTIONS,
    prompt: buildPrompt(request),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    timeout: GATEWAY_TIMEOUT_MS,
    providerOptions: {
      [provider]: {
        thinkingConfig: {
          thinkingLevel: request.effort,
          includeThoughts: true,
        },
      },
    },
  };
}

export class GatewayPortError extends Error {
  readonly attempts: string[];

  constructor(message: string, attempts: string[]) {
    super(message);
    this.name = "GatewayPortError";
    this.attempts = attempts;
  }
}

export function createGatewayAdapter(env: Env, client: GatewayClient = defaultClient): PortAdapter {
  const model = resolveGatewayModel(env);
  return {
    mode: "live",
    model,
    port(request) {
      return portLive(request, model, client);
    },
  };
}

async function portLive(
  request: PortRequest,
  model: string,
  client: GatewayClient,
): Promise<PortResult> {
  const started = Date.now();
  let googleProblem: string | null = null;

  try {
    const reply = await client(buildGatewayCall(request, "google", model));
    if (!mentionsThinking(reply.warnings)) {
      return toResult(reply, request, model, started, []);
    }
    googleProblem = `providerOptions.google warnings mentioned thinking: ${JSON.stringify(reply.warnings)}`;
  } catch (error) {
    if (!isThinkingRejection(error)) throw error;
    googleProblem = errorText(error);
  }

  try {
    const reply = await client(buildGatewayCall(request, "vertex", model));
    if (mentionsThinking(reply.warnings)) {
      throw new GatewayPortError(stoppedMessage(model, googleProblem, JSON.stringify(reply.warnings)), [
        "google",
        "vertex",
      ]);
    }
    return toResult(reply, request, model, started, [
      `providerOptions.google did not accept thinkingConfig. Retried the same shape under providerOptions.vertex. ${googleProblem ?? ""}`.trim(),
    ]);
  } catch (error) {
    if (error instanceof GatewayPortError) throw error;
    throw new GatewayPortError(stoppedMessage(model, googleProblem, errorText(error)), [
      "google",
      "vertex",
    ]);
  }
}

function toResult(
  reply: GatewayReply,
  request: PortRequest,
  model: string,
  started: number,
  extraNotes: string[],
): PortResult {
  const html = extractHtml(reply.text);
  if (!html) {
    throw new Error("The model did not return a complete HTML document. Nothing was sent to the iframe.");
  }
  const prompt = `${PORT_INSTRUCTIONS}\n${buildPrompt(request)}`;
  const normalized = normalizeUsage(reply.usage, prompt, html);
  const reasoning = reply.reasoningText?.trim();
  return {
    html,
    reasoning: reasoning || undefined,
    latencyMs: Date.now() - started,
    usage: normalized.usage,
    costUsd: costUsd(normalized.usage),
    source: "live",
    effort: request.effort,
    model,
    notes: [...extraNotes, ...normalized.notes],
  };
}

function defaultClient(options: GatewayCall): Promise<GatewayReply> {
  return generateText(options);
}

function mentionsThinking(warnings: unknown): boolean {
  if (warnings == null) return false;
  return THINKING_REJECTION.test(JSON.stringify(warnings));
}

function isThinkingRejection(error: unknown): boolean {
  return THINKING_REJECTION.test(errorText(error));
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    const extra = error as Error & { responseBody?: unknown; data?: unknown };
    const body = extra.responseBody == null ? "" : `\n${String(extra.responseBody)}`;
    const data = extra.data == null ? "" : `\n${JSON.stringify(extra.data)}`;
    return `${error.message}${body}${data}`;
  }
  return String(error);
}

function stoppedMessage(model: string, googleProblem: string | null, vertexDetail: string): string {
  return [
    `thinkingConfig was not accepted for ${model}.`,
    "Tried providerOptions.google, then the same shape under providerOptions.vertex.",
    "Stopped without using the top-level AI SDK reasoning option.",
    googleProblem ? `google: ${googleProblem}` : "",
    `vertex: ${vertexDetail}`,
  ]
    .filter(Boolean)
    .join(" ");
}
