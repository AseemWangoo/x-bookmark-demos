import { z } from "zod";

import { listFixtures } from "./adapter/mock.ts";
import type { PortAdapter } from "./adapter/types.ts";
import { modePayload } from "./mode.ts";

const portRequestSchema = z.object({
  source: z.string().trim().min(1).max(20_000),
  language: z.string().trim().min(1).max(40).optional(),
  effort: z.enum(["low", "medium", "high"]),
});

export function createApp(adapter: PortAdapter, options?: { redacted?: string }) {
  return {
    handle(request: Request): Promise<Response> {
      return handle(request, adapter, options?.redacted);
    },
  };
}

async function handle(
  request: Request,
  adapter: PortAdapter,
  redacted: string | undefined,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/mode") {
    return json(modePayload(adapter));
  }
  if (request.method === "GET" && url.pathname === "/api/fixtures") {
    return json({ fixtures: listFixtures() });
  }
  if (request.method === "POST" && url.pathname === "/api/port") {
    return port(request, adapter, redacted);
  }
  return json({ error: "Not found." }, 404);
}

async function port(
  request: Request,
  adapter: PortAdapter,
  redacted: string | undefined,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Expected JSON." }, 400);
  }
  const parsed = portRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Source and an effort of low, medium, or high are required." }, 400);
  }
  try {
    const result = await adapter.port(parsed.data);
    return json(result);
  } catch (error) {
    return json({ error: publicError(error, redacted) }, 502);
  }
}

function publicError(error: unknown, redacted: string | undefined): string {
  const message = error instanceof Error ? error.message : "Port failed.";
  const secret = redacted?.trim();
  const scrubbed = secret ? message.replaceAll(secret, "[redacted]") : message;
  return scrubbed.slice(0, 2000);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
