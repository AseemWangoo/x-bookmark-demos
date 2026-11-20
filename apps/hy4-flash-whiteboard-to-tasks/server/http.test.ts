import { describe, expect, test } from "bun:test";

import { LIVE_REQUIRED } from "../shared/copy.ts";
import { FIXTURES } from "../shared/fixtures.ts";
import type { ExtractResult, ModePayload } from "../shared/types.ts";
import { createMockAdapter } from "./adapter/mock.ts";
import { createApp } from "./http.ts";
import { selectAdapter } from "./mode.ts";
import { tokenhubKey } from "./env.ts";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function request(path: string, body?: unknown): Request {
  return new Request(`http://127.0.0.1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("http", () => {
  test("mode hides the key and live selects TokenHub when that key is first", async () => {
    const secret = "hub-key-do-not-leak";
    const env = { TOKENHUB_API_KEY: secret };
    const app = createApp(selectAdapter(env), env);
    const response = await app.handle(request("/api/mode"));
    const payload = (await response.json()) as ModePayload;
    expect(response.status).toBe(200);
    expect(payload.mode).toBe("live");
    expect(payload.provider).toBe("tokenhub");
    expect(payload.model).toBe("hy4-flash");
    expect(JSON.stringify(payload)).not.toContain(secret);
    expect(selectAdapter({}).mode).toBe("mock");
    expect(selectAdapter({ MOCK: "1", OPENROUTER_API_KEY: secret }).mode).toBe("mock");
    expect(tokenhubKey({ HUNYUAN_API_KEY: "hunyuan", HY4_FLASH_API_KEY: "fallback" })).toBe("hunyuan");
    expect(tokenhubKey({ HY4_FLASH_API_KEY: "fallback" })).toBe("fallback");
    expect(tokenhubKey({ TOKENHUB_API_KEY: "first", HUNYUAN_API_KEY: "second" })).toBe("first");
  });

  test("mock extract returns the sample board and refuses a novel upload", async () => {
    const app = createApp(createMockAdapter({}), {});
    const fixture = FIXTURES[0];
    if (!fixture) throw new Error("missing fixture");
    const ok = await app.handle(
      request("/api/extract", {
        text: fixture.text,
        images: fixture.images.map((image) => ({ id: image.id, name: image.name, dataUrl: TINY_PNG })),
        fixtureId: fixture.id,
        effort: "no_think",
        provider: null,
      }),
    );
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as ExtractResult;
    expect(body.source).toBe("mock");
    expect(body.board.tasks.length).toBe(fixture.board.tasks.length);
    expect(body.model).toBe("hy4-flash");

    const refused = await app.handle(
      request("/api/extract", {
        text: "something I just pasted",
        images: [{ id: "upload", name: "desk.png", dataUrl: TINY_PNG }],
        fixtureId: null,
        effort: "no_think",
        provider: null,
      }),
    );
    expect(refused.status).toBe(422);
    const error = (await refused.json()) as { error: string };
    expect(error.error).toBe(LIVE_REQUIRED);
  });

  test("empty and oversized image requests fail before a model call", async () => {
    const app = createApp(createMockAdapter({}), {});
    const empty = await app.handle(
      request("/api/extract", { text: "   ", images: [], fixtureId: null, effort: "no_think", provider: null }),
    );
    expect(empty.status).toBe(400);
    const bad = await app.handle(
      request("/api/extract", {
        text: "",
        images: [{ id: "x", name: "x.gif", dataUrl: "data:image/gif;base64,@@@" }],
        fixtureId: null,
        effort: "no_think",
        provider: null,
      }),
    );
    expect(bad.status).toBe(400);
  });
});
