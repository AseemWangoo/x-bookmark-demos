import { costInr } from "../src/lib/pricing";
import { nonSpaceLength } from "../src/lib/text";
import { buildRequest, callPrism } from "./prism";
import { resolveEnv, type AppEnv } from "./env";
import { mockRoute } from "./mock";
import { normalizeAnswers, toRoutingResult } from "./normalize";
import { routeBodySchema, sarvamResponseSchema, translateBodySchema } from "./schema";
import { translateText } from "./translate";

export type HandlerDeps = {
  env?: AppEnv;
  fetchImpl?: typeof fetch;
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function errorBody(status: number, code: string, message: string): Response {
  return json({ error: { status, code, message } }, status);
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function handleRequest(request: Request, deps: HandlerDeps = {}): Promise<Response> {
  const url = new URL(request.url);
  const env = resolveEnv(deps.env ?? Bun.env);

  if (request.method === "GET" && url.pathname === "/api/mode") {
    return json({
      mode: env.mode,
      model: env.model,
      autoThreshold: env.autoThreshold,
    });
  }

  if (request.method === "POST" && url.pathname === "/api/translate") {
    const parsed = translateBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorBody(400, "invalid_request_error", "Invalid translate body");
    if (env.mode === "mock") {
      return errorBody(400, "mock_mode", "Translations of your own text need live mode");
    }
    try {
      const translated = await translateText(parsed.data.text, parsed.data.targetLang, {
        env,
        signal: request.signal,
        fetchImpl: deps.fetchImpl,
      });
      if ("error" in translated) return errorBody(translated.error.status, translated.error.code, translated.error.message);
      return json({ translatedText: translated.translatedText, targetLang: parsed.data.targetLang });
    } catch (error) {
      if (isAbort(error)) return errorBody(499, "aborted", "client disconnected");
      return errorBody(502, "translate_failed", "Translation failed");
    }
  }

  if (request.method === "POST" && url.pathname === "/api/route") {
    const parsed = routeBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorBody(400, "invalid_request_error", "Invalid route body");
    if (nonSpaceLength(parsed.data.text) < 6) {
      return errorBody(400, "invalid_request_error", "Message needs at least 6 non-space characters");
    }

    const useMock = env.mode === "mock" || parsed.data.forceMock === true;
    try {
      if (useMock) {
        const hit = await mockRoute(parsed.data.text, env.mockSpeed, request.signal);
        const response = sarvamResponseSchema.parse(hit.response);
        const result = toRoutingResult(normalizeAnswers(response.answers));
        return json({
          mode: "mock",
          model: env.model,
          result,
          raw: { request: buildRequest(parsed.data.text, env.model), response },
          serverMs: hit.serverMs,
          usage: response.usage,
          costInr: costInr(response.usage.input_tokens),
          synthetic: true,
          source: hit.source,
        });
      }

      const live = await callPrism(parsed.data.text, {
        env,
        signal: request.signal,
        fetchImpl: deps.fetchImpl,
      });
      if (!live.ok) {
        return json(
          {
            error: live.error,
            raw: { request: live.requestBody, response: live.raw },
          },
          live.error.status,
        );
      }
      let result;
      try {
        result = toRoutingResult(normalizeAnswers(live.response.answers));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not read Sarvam answers";
        return json(
          {
            error: { status: 502, code: "invalid_response", message },
            raw: { request: live.requestBody, response: live.response },
          },
          502,
        );
      }
      return json({
        mode: "live",
        model: live.response.model,
        result,
        raw: { request: live.requestBody, response: live.response },
        serverMs: live.serverMs,
        usage: live.response.usage,
        costInr: costInr(live.response.usage.input_tokens),
        synthetic: false,
        source: "live",
        requestId: live.requestId,
      });
    } catch (error) {
      if (isAbort(error)) return errorBody(499, "aborted", "client disconnected");
      const message = error instanceof Error ? error.message : "Route failed";
      return errorBody(500, "internal_error", message);
    }
  }

  return errorBody(404, "not_found", "Not found");
}
