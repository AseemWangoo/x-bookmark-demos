import { describe, expect, test } from "bun:test";

import { PRESETS } from "../fixtures/presets";
import { handleRequest } from "../server/http";

const secret = "super-secret-key";

function route(body: unknown, env: Record<string, string | undefined> = {}, fetchImpl?: typeof fetch) {
  return handleRequest(
    new Request("http://127.0.0.1:8787/api/route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { env, fetchImpl },
  );
}

describe("handlers", () => {
  test("with no key, /api/route never calls fetch and is synthetic", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      throw new Error("fetch should not run");
    };
    const response = await route({ text: PRESETS[0]?.variants.en }, {}, fetchImpl);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(calls).toBe(0);
    expect(payload.synthetic).toBe(true);
    expect(payload.mode).toBe("mock");
    expect(payload.source).toBe("fixture");
    expect(JSON.stringify(payload)).not.toContain(secret);
  });

  test("/api/mode never includes the key", async () => {
    const response = await handleRequest(new Request("http://127.0.0.1:8787/api/mode"), {
      env: { SARVAM_API_KEY: secret, PRISM_MODEL: "sarvam-prism" },
    });
    const payload = await response.json();
    expect(payload).toEqual({ mode: "live", model: "sarvam-prism", autoThreshold: 0.9 });
    expect(JSON.stringify(payload)).not.toContain(secret);
    expect(payload.apiKey).toBeUndefined();
  });

  test("bad bodies are 400", async () => {
    const missing = await route({});
    expect(missing.status).toBe(400);
    const short = await route({ text: "hi" });
    expect(short.status).toBe(400);
    const huge = await route({ text: "a".repeat(4001) });
    expect(huge.status).toBe(400);
  });

  test("upstream 403, 422, and 429 map onto status, code, and message", async () => {
    const cases = [
      {
        status: 403,
        body: { error: { message: "nope", code: "invalid_api_key_error", request_id: "r1" } },
        message: "bad key",
        code: "invalid_api_key_error",
      },
      {
        status: 422,
        body: {
          error: {
            message: "bad field",
            code: "unprocessable_entity_error",
            request_id: "r2",
            param: "questions.team.instruction",
          },
        },
        message: "bad field (questions.team.instruction)",
        code: "unprocessable_entity_error",
      },
      {
        status: 429,
        body: { error: { message: "slow down", code: "rate_limit_exceeded_error", request_id: "r3" } },
        message: "slow down",
        code: "rate_limit_exceeded_error",
      },
    ];

    for (const item of cases) {
      let calls = 0;
      const fetchImpl: typeof fetch = async (input, init) => {
        calls += 1;
        const url = String(input);
        expect(url).toBe("https://api.sarvam.ai/v2/systemone");
        const headers = new Headers(init?.headers);
        expect(headers.get("api-subscription-key")).toBe(secret);
        const sent = JSON.parse(String(init?.body));
        expect(sent.model).toBe("sarvam-prism");
        expect(Object.keys(sent).sort()).toEqual(["model", "questions", "state"]);
        return new Response(JSON.stringify(item.body), { status: item.status });
      };
      const response = await route({ text: "paisa kat gaya" }, { SARVAM_API_KEY: secret }, fetchImpl);
      const payload = await response.json();
      expect(response.status).toBe(item.status);
      expect(payload.error).toEqual({ status: item.status, code: item.code, message: item.message });
      expect(JSON.stringify(payload)).not.toContain(secret);
      expect(calls).toBe(item.status === 429 ? 2 : 1);
    }
  });
});
