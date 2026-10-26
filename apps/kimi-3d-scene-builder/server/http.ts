import { listExamples } from "../fixtures/mock-scenes.ts";
import { estimateCostUsd } from "../src/lib/pricing.ts";
import type { TurnEvent, TurnRequest } from "../src/lib/types.ts";
import { extractCode } from "./code.ts";
import { publicMode, readEnv, redact, type ServerEnv } from "./env.ts";
import {
  buildChatRequest,
  createKimiClient,
  describeKimiFailure,
  KIMI_MODELS,
  streamChat,
} from "./kimi.ts";
import { streamMockTurn } from "./mock.ts";
import { withUpstreamSlot } from "./pool.ts";
import { buildMessages } from "./prompt.ts";
import { HttpError, parseTurnRequest } from "./schema.ts";

export function handleMode(): Response {
  return Response.json(publicMode());
}

export function handleExamples(): Response {
  return Response.json(listExamples());
}

export async function handleTurn(request: Request): Promise<Response> {
  const env = readEnv();
  let payload: unknown;
  try {
    const text = await request.text();
    if (text.length > 256_000) return Response.json({ error: "Body too large" }, { status: 400 });
    payload = text.length === 0 ? null : JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Invalid JSON" }, { status: 400 });
    const message = error instanceof Error ? error.message : "Invalid request";
    return Response.json({ error: redact(message, env.apiKey) }, { status: 400 });
  }

  let parsed: TurnRequest;
  try {
    parsed = parseTurnRequest(payload);
  } catch (error) {
    const http = error instanceof HttpError ? error : new HttpError(400, "Invalid request");
    return Response.json({ error: redact(http.message, env.apiKey) }, { status: http.status });
  }

  const useMock = env.mode === "mock" || parsed.forceMock === true;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: TurnEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        if (useMock) await streamMockTurn(parsed, send);
        else await streamLive(parsed, env, send);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Turn failed";
        console.error(redact(message, env.apiKey));
        send({ type: "error", message: redact(message, env.apiKey) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function streamLive(request: TurnRequest, env: ServerEnv, send: (event: TurnEvent) => void): Promise<void> {
  if (!env.apiKey) {
    send({ type: "error", message: "MOONSHOT_API_KEY is not set" });
    return;
  }
  const client = createKimiClient(env.apiKey, env.baseURL);
  const body = buildChatRequest({
    model: request.model,
    effort: request.effort,
    messages: buildMessages(request),
    maxCompletionTokens: env.maxCompletionTokens,
  });
  send({
    type: "start",
    model: request.model,
    modelId: KIMI_MODELS[request.model],
    effort: request.effort,
    synthetic: false,
  });
  try {
    const fold = await withUpstreamSlot(() =>
      streamChat(client, body, (event) => {
        send(event);
      }),
    );
    const extracted = extractCode(fold.content);
    if (!extracted.ok) {
      send({ type: "error", message: extracted.message });
      return;
    }
    send({
      type: "done",
      code: extracted.code,
      usage: fold.usage,
      timings: {
        ttftMs: fold.ttftMs ?? fold.totalMs,
        firstContentMs: fold.firstContentMs ?? fold.totalMs,
        totalMs: fold.totalMs,
      },
      costUsd: estimateCostUsd(request.model, fold.usage),
      finishReason: fold.finishReason,
      synthetic: false,
    });
  } catch (error) {
    const failure = describeKimiFailure(error);
    console.error(redact(failure.message, env.apiKey));
    send({
      type: "error",
      status: failure.status,
      errorType: failure.errorType,
      message: redact(failure.message, env.apiKey),
    });
  }
}
