import { z } from "zod";

import { DEFAULT_MODEL, LENGTH_WARNING, NUM_CTX, NUM_PREDICT } from "../../shared/copy.ts";
import type { TokenUsage, TranscribeRequest } from "../../shared/types.ts";
import { configuredOrigin, ollamaModel, type FetchLike } from "../env.ts";
import { buildResult } from "../transcribe.ts";
import { TranscribeError, type TranscribeAdapter } from "./types.ts";

const replySchema = z.object({
  message: z
    .object({
      content: z.string(),
      role: z.string().optional(),
    })
    .optional(),
  done_reason: z.string().optional(),
  prompt_eval_count: z.number().optional(),
  eval_count: z.number().optional(),
});

export type OllamaChatBody = {
  model: string;
  think: false;
  stream: false;
  keep_alive: "5m";
  messages: [
    {
      role: "user";
      content: "";
      images: [string];
    },
  ];
  options: {
    temperature: 0;
    num_ctx: number;
    num_predict: number;
  };
};

export function buildChatBody(model: string, imageBase64: string): OllamaChatBody {
  const image = imageBase64.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  return {
    model,
    think: false,
    stream: false,
    keep_alive: "5m",
    messages: [{ role: "user", content: "", images: [image] }],
    options: {
      temperature: 0,
      num_ctx: NUM_CTX,
      num_predict: NUM_PREDICT,
    },
  };
}

export function readOllamaReply(payload: unknown): {
  content: string;
  doneReason: string | null;
  usage?: TokenUsage;
  warning: string | null;
} {
  const parsed = replySchema.safeParse(payload);
  if (!parsed.success || !parsed.data.message) {
    throw new TranscribeError("Ollama returned a response without message content.", 502);
  }
  const doneReason = parsed.data.done_reason ?? null;
  const usage =
    parsed.data.prompt_eval_count === undefined && parsed.data.eval_count === undefined
      ? undefined
      : {
          promptTokens: parsed.data.prompt_eval_count ?? 0,
          evalTokens: parsed.data.eval_count ?? 0,
        };
  return {
    content: parsed.data.message.content,
    doneReason,
    usage,
    warning: doneReason === "length" ? LENGTH_WARNING : null,
  };
}

export function createOllamaAdapter(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: FetchLike = fetch,
): TranscribeAdapter {
  return {
    mode: "live",
    async transcribe(request: TranscribeRequest) {
      const origin = configuredOrigin(env);
      if (!origin) throw new TranscribeError("Ollama host is not a loopback origin.", 400);
      const model = ollamaModel(env);
      const body = buildChatBody(model, request.imageBase64);
      const started = performance.now();
      let response: Response;
      try {
        response = await fetchImpl(new URL("/api/chat", origin), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          redirect: "error",
          signal: AbortSignal.timeout(900_000),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "request failed";
        throw new TranscribeError(`Ollama request failed: ${message}`, 502);
      }
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 180);
        throw new TranscribeError(`Ollama returned HTTP ${response.status}. ${detail}`.trim(), 502);
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new TranscribeError("Ollama returned a response that was not JSON.", 502);
      }
      const reply = readOllamaReply(payload);
      const wallMs = Math.round(performance.now() - started);
      return buildResult({
        rawMarkdown: reply.content,
        wallMs,
        doneReason: reply.doneReason,
        source: "live",
        model,
        usage: reply.usage,
        warning: reply.warning,
        label: `Transcription from ${model} via local Ollama.`,
      });
    },
  };
}

export const LIVE_MODEL_DEFAULT = DEFAULT_MODEL;
