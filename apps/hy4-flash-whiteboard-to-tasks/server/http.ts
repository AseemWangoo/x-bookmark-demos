import { z } from "zod";

import { LIVE_REQUIRED, MAX_IMAGES, MAX_TEXT_CHARS } from "../shared/copy.ts";
import { effortSchema } from "../shared/schema.ts";
import type { ExtractRequest } from "../shared/types.ts";
import type { ExtractAdapter } from "./adapter/types.ts";
import { ExtractError } from "./adapter/types.ts";
import { validateImageDataUrl } from "./image.ts";
import { modePayload } from "./mode.ts";

const bodySchema = z.strictObject({
  text: z.string().max(MAX_TEXT_CHARS),
  images: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(80),
        name: z.string().min(1).max(180),
        dataUrl: z.string().min(1).max(16_000_000),
      }),
    )
    .max(MAX_IMAGES),
  fixtureId: z.string().max(64).nullable(),
  effort: effortSchema,
  provider: z.enum(["tokenhub", "openrouter", "custom"]).nullable(),
});

export function createApp(adapter: ExtractAdapter, env: NodeJS.ProcessEnv = process.env) {
  return {
    handle(request: Request): Promise<Response> {
      return handle(request, adapter, env);
    },
  };
}

async function handle(request: Request, adapter: ExtractAdapter, env: NodeJS.ProcessEnv): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/mode") return json(modePayload(env));
  if (request.method === "POST" && url.pathname === "/api/extract") return extract(request, adapter);
  return json({ error: "Not found." }, 404);
}

async function extract(request: Request, adapter: ExtractAdapter): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Expected JSON." }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return json({ error: "Check the photos, thread, effort, and provider." }, 400);
  const data = parsed.data;
  if (!data.text.trim() && data.images.length === 0) {
    return json({ error: "Add whiteboard photos or a pasted thread." }, 400);
  }
  for (const image of data.images) {
    const problem = validateImageDataUrl(image.dataUrl);
    if (problem) return json({ error: problem }, 400);
  }
  const job: ExtractRequest = {
    text: data.text,
    images: data.images,
    fixtureId: data.fixtureId,
    effort: data.effort,
    provider: data.provider,
  };
  try {
    const result = await adapter.run(job);
    return json(result);
  } catch (error) {
    if (error instanceof ExtractError) return json({ error: error.message }, error.status);
    const message = error instanceof Error ? error.message : "Extract failed.";
    if (message === LIVE_REQUIRED) return json({ error: message }, 422);
    return json({ error: "Extract failed." }, 502);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
