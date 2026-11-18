import { z } from "zod";

import { MODEL_KEYS, SERVICE_TIERS } from "../shared/copy.ts";
import type { AssembleResponse } from "../shared/result.ts";
import { AssembleError, type AssemblyAdapter } from "./adapter/types.ts";
import { parseImageDataUrl } from "./image.ts";
import { modePayload } from "./mode.ts";

const bodySchema = z.object({
  sourceText: z.string().max(20_000).optional(),
  imageDataUrl: z.string().max(14_000_000).optional(),
  fixtureId: z.string().max(64).optional(),
  models: z.array(z.enum(MODEL_KEYS)).min(1).max(2),
  serviceTier: z.enum(SERVICE_TIERS),
});

export function createApp(adapter: AssemblyAdapter, env: NodeJS.ProcessEnv = process.env) {
  return {
    handle(request: Request): Promise<Response> {
      return handle(request, adapter, env);
    },
  };
}

async function handle(
  request: Request,
  adapter: AssemblyAdapter,
  env: NodeJS.ProcessEnv,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/mode") {
    return json(modePayload(env));
  }
  if (request.method === "POST" && url.pathname === "/api/assemble") {
    return assemble(request, adapter);
  }
  return json({ error: "Not found." }, 404);
}

async function assemble(request: Request, adapter: AssemblyAdapter): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Expected JSON." }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return json({ error: "Check the parts list, photo, models, and service tier." }, 400);
  const data = parsed.data;
  const sourceText = data.sourceText?.trim() ?? "";
  if (!sourceText && !data.imageDataUrl && !data.fixtureId) {
    return json({ error: "Add a parts list, a fixture, or a photo." }, 400);
  }
  if (data.imageDataUrl && !parseImageDataUrl(data.imageDataUrl)) {
    return json({ error: "Photo must be a PNG, JPEG, or WebP data URL under 10 MB." }, 400);
  }
  const models = [...new Set(data.models)];
  const settled = await Promise.allSettled(
    models.map((modelKey) =>
      adapter.run({
        modelKey,
        serviceTier: data.serviceTier,
        sourceText,
        imageDataUrl: data.imageDataUrl,
        fixtureId: data.fixtureId,
      }),
    ),
  );
  const payload: AssembleResponse = { results: [], errors: [] };
  let statusFromError = 502;
  for (const [index, entry] of settled.entries()) {
    const modelKey = models[index];
    if (!modelKey) continue;
    if (entry.status === "fulfilled") {
      payload.results.push(entry.value);
      continue;
    }
    const error = entry.reason;
    const message = error instanceof Error ? error.message : "Assemble failed.";
    if (error instanceof AssembleError) statusFromError = error.status;
    payload.errors.push({ modelKey, message });
  }
  if (payload.results.length === 0) {
    const message = payload.errors[0]?.message ?? "Assemble failed.";
    return json({ error: message, errors: payload.errors }, statusFromError);
  }
  return json(payload);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
