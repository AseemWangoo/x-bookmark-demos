import { INBOX } from "../fixtures/messages.ts";
import type { TriageResponse } from "../src/lib/types.ts";
import { publicMode, redact, readEnv } from "./env.ts";
import { assertBodySize, HttpError, parseTriageRequest } from "./schema.ts";
import { runTriage } from "./runner.ts";

export function handleMode(): Response {
  return Response.json(publicMode());
}

export function handleFixtures(): Response {
  return Response.json(INBOX);
}

export async function handleTriageRequest(request: Request): Promise<Response> {
  const env = readEnv();
  try {
    const text = await request.text();
    assertBodySize(text);
    const body: unknown = text.length === 0 ? null : JSON.parse(text);
    const parsed = parseTriageRequest(body);
    const result: TriageResponse = await runTriage(parsed);
    return Response.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const http = error instanceof HttpError ? error : new HttpError(500, "Triage failed");
    console.error(redact(http.message, env.apiKey));
    return Response.json({ error: redact(http.message, env.apiKey) }, { status: http.status });
  }
}
