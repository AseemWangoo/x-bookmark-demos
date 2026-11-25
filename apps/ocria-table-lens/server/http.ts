import { z } from "zod";

import { MAX_IMAGE_BYTES } from "../shared/copy.ts";
import type { TranscribeRequest } from "../shared/types.ts";
import type { TranscribeAdapter } from "./adapter/types.ts";
import { TranscribeError } from "./adapter/types.ts";
import { decodeImage } from "./fixture.ts";
import { modePayload } from "./mode.ts";

const bodySchema = z.strictObject({
  imageBase64: z.string().min(1).max(18_000_000),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
});

export function createApp(adapter: TranscribeAdapter, env: NodeJS.ProcessEnv = process.env) {
  return {
    handle(request: Request): Promise<Response> {
      return handle(request, adapter, env);
    },
  };
}

async function handle(request: Request, adapter: TranscribeAdapter, env: NodeJS.ProcessEnv): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/mode") return json(modePayload(env, adapter.mode));
  if (request.method === "POST" && url.pathname === "/api/transcribe") return transcribe(request, adapter);
  return json({ error: "Not found." }, 404);
}

async function transcribe(request: Request, adapter: TranscribeAdapter): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Expected JSON." }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return json({ error: "Send a PNG, JPEG, or WebP page image." }, 400);
  const image = decodeImage(parsed.data.imageBase64);
  if (image.byteLength === 0) return json({ error: "That image is empty." }, 400);
  if (image.byteLength > MAX_IMAGE_BYTES) return json({ error: "That page image is over 12 MB." }, 400);
  const job: TranscribeRequest = {
    imageBase64: parsed.data.imageBase64,
    mimeType: parsed.data.mimeType,
  };
  try {
    const result = await adapter.transcribe(job);
    return json(result);
  } catch (error) {
    if (error instanceof TranscribeError) return json({ error: error.message }, error.status);
    return json({ error: "Transcription failed." }, 502);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
