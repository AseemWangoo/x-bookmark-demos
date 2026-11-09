import { z } from "zod";

import { runDuel } from "./duel.ts";
import { parseImageDataUrl } from "./image.ts";
import { modePayload } from "./mode.ts";
import type { DesignAdapter } from "./adapter/types.ts";
import type { DuelEvent } from "../shared/duel.ts";

const duelRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(8_000),
  imageDataUrl: z.string().trim().max(6_000_000).optional(),
});

export function createApp(adapter: DesignAdapter) {
  return {
    handle(request: Request): Promise<Response> {
      return handle(request, adapter);
    },
  };
}

async function handle(request: Request, adapter: DesignAdapter): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/mode") {
    return json(modePayload(adapter));
  }
  if (request.method === "POST" && url.pathname === "/api/duel") {
    return duel(request, adapter);
  }
  return json({ error: "Not found." }, 404);
}

async function duel(request: Request, adapter: DesignAdapter): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Expected JSON." }, 400);
  }
  const parsed = duelRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Prompt is required." }, 400);
  }
  if (parsed.data.imageDataUrl && !parseImageDataUrl(parsed.data.imageDataUrl)) {
    return json({ error: "Sketch must be a PNG or JPEG data URI." }, 400);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: DuelEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        await runDuel(adapter, parsed.data, send);
      } catch (error) {
        send({
          type: "error",
          effort: "low",
          message: error instanceof Error ? error.message : "Duel failed.",
        });
        send({
          type: "error",
          effort: "high",
          message: error instanceof Error ? error.message : "Duel failed.",
        });
        send({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
