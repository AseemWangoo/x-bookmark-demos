import { describe, expect, test } from "bun:test";

import { LENGTH_WARNING, LIVE_REQUIRED, MOCK_BANNER } from "../shared/copy.ts";
import type { ModePayload, TranscribeResult } from "../shared/types.ts";
import { createMockAdapter } from "./adapter/mock.ts";
import { buildChatBody, createOllamaAdapter, readOllamaReply } from "./adapter/ollama.ts";
import { configuredOrigin, detectMode, loopbackOrigin, type FetchLike } from "./env.ts";
import { loadFixture } from "./fixture.ts";
import { createApp } from "./http.ts";
import { modePayload, selectAdapter } from "./mode.ts";

const PROMPT = await Bun.file(new URL("../shared/prompt.txt", import.meta.url)).text();

function request(path: string, body?: unknown): Request {
  return new Request(`http://127.0.0.1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("loopback", () => {
  test("accepts loopback origins and rejects everything else", () => {
    expect(loopbackOrigin("http://127.0.0.1:11434")?.origin).toBe("http://127.0.0.1:11434");
    expect(loopbackOrigin("http://localhost:11434")?.hostname).toBe("localhost");
    expect(loopbackOrigin("http://[::1]:11434")?.origin).toBe("http://[::1]:11434");
    expect(loopbackOrigin("https://127.0.0.1:11434")).not.toBeNull();
    expect(loopbackOrigin("http://10.1.2.3:11434")).toBeNull();
    expect(loopbackOrigin("https://ollama.com")).toBeNull();
    expect(loopbackOrigin("http://127.0.0.1.evil.com")).toBeNull();
    expect(loopbackOrigin("http://user:secret@127.0.0.1:11434")).toBeNull();
    expect(loopbackOrigin("file:///etc/passwd")).toBeNull();
    expect(configuredOrigin({})?.origin).toBe("http://127.0.0.1:11434");
  });

  test("does not probe when mock is forced or the host is not loopback", async () => {
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls += 1;
      return new Response("ok");
    };
    const forced = await detectMode({ MOCK: "1", OLLAMA_HOST: "http://127.0.0.1:11434" }, fetchImpl);
    expect(forced.mode).toBe("mock");
    expect(forced.reason).toBe("mock-flag");
    const remote = await detectMode({ OLLAMA_HOST: "http://user:secret@10.0.0.8:11434" }, fetchImpl);
    expect(remote.mode).toBe("mock");
    expect(remote.reason).toBe("non-loopback");
    expect(calls).toBe(0);
    const down = await detectMode({ OLLAMA_HOST: "http://127.0.0.1:11434" }, async () => {
      throw new Error("offline");
    });
    expect(down.mode).toBe("mock");
    expect(down.reason).toBe("unreachable");
  });
});

describe("mode payload", () => {
  test("never includes secrets", () => {
    const secret = "sk-live-DO-NOT-LEAK-ocria";
    const env = {
      MOCK: "1",
      OLLAMA_API_KEY: secret,
      OLLAMA_HOST: `http://user:${secret}@evil.example`,
      OLLAMA_MODEL: "llamaindex/ocria-1",
    };
    const payload = modePayload(env, "mock");
    expect(payload.banner).toBe(MOCK_BANNER);
    expect(payload.mode).toBe("mock");
    expect(payload.host).toBeNull();
    expect(JSON.stringify(payload)).not.toContain(secret);
    expect(payload.model).toBe("llamaindex/ocria-1");
  });
});

describe("mock transcription", () => {
  test("returns the sample and refuses a different image", async () => {
    const app = createApp(createMockAdapter(), { MOCK: "1" });
    const fixture = loadFixture();
    const ok = await app.handle(
      request("/api/transcribe", {
        imageBase64: Buffer.from(fixture.bytes).toString("base64"),
        mimeType: "image/png",
      }),
    );
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as TranscribeResult;
    expect(body.source).toBe("mock");
    expect(body.model).toBe("llamaindex/ocria-1");
    expect(body.doneReason).toBe("recorded");
    expect(body.label.toLowerCase()).toContain("not model output");
    expect(body.usage).toBeUndefined();
    expect(body.tables[0]?.rows[1]?.[0]).toBe("");
    expect(body.markdown).not.toContain("```markdown");

    const mode = await app.handle(request("/api/mode"));
    const payload = (await mode.json()) as ModePayload;
    expect(payload.banner).toBe(MOCK_BANNER);
    expect(payload.mode).toBe("mock");

    const refused = await app.handle(
      request("/api/transcribe", {
        imageBase64: Buffer.from([1, 2, 3, 4]).toString("base64"),
        mimeType: "image/png",
      }),
    );
    expect(refused.status).toBe(422);
    const error = (await refused.json()) as { error: string };
    expect(error.error).toBe(LIVE_REQUIRED);
  });

  test("rejects an empty image before inventing markdown", async () => {
    const app = createApp(createMockAdapter(), {});
    const empty = await app.handle(request("/api/transcribe", { imageBase64: "   ", mimeType: "image/png" }));
    expect(empty.status).toBe(400);
    const bad = await app.handle(request("/api/transcribe", { imageBase64: "abcd", mimeType: "image/gif" }));
    expect(bad.status).toBe(400);
  });
});

describe("ollama adapter", () => {
  test("builds the native chat body with no system prompt", () => {
    const body = buildChatBody("llamaindex/ocria-1", "data:image/png;base64,aaaa");
    expect(body.think).toBe(false);
    expect(body.stream).toBe(false);
    expect(body.keep_alive).toBe("5m");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]?.role).toBe("user");
    expect(body.messages[0]?.content).toBe("");
    expect(body.messages[0]?.images).toEqual(["aaaa"]);
    expect(body.options).toEqual({ temperature: 0, num_ctx: 32768, num_predict: 24576 });
    expect(JSON.stringify(body)).not.toContain("system");
    expect(JSON.stringify(body)).not.toContain(PROMPT.slice(0, 24));
  });

  test("warns when the model hits the length cutoff and strips the fence", async () => {
    const seen: { url?: string; body?: unknown } = {};
    const fetchImpl: FetchLike = async (input, init) => {
      seen.url = String(input);
      seen.body = JSON.parse(String(init?.body));
      return Response.json({
        message: { role: "assistant", content: "```markdown\n# Page\n<table><tr><td>a</td></tr></table>\n```" },
        done_reason: "length",
        prompt_eval_count: 80,
        eval_count: 24576,
      });
    };
    const adapter = createOllamaAdapter({ OLLAMA_HOST: "http://127.0.0.1:11434" }, fetchImpl);
    const result = await adapter.transcribe({ imageBase64: "bbbb", mimeType: "image/png" });
    expect(seen.url).toBe("http://127.0.0.1:11434/api/chat");
    expect(result.source).toBe("live");
    expect(result.warning).toBe(LENGTH_WARNING);
    expect(result.doneReason).toBe("length");
    expect(result.markdown.startsWith("# Page")).toBe(true);
    expect(result.usage).toEqual({ promptTokens: 80, evalTokens: 24576 });
    expect(result.tables).toHaveLength(1);
    const reply = readOllamaReply({ message: { content: "plain" }, done_reason: "stop" });
    expect(reply.warning).toBeNull();
  });

  test("selects live only when the loopback version endpoint answers", async () => {
    const live = await selectAdapter({ OLLAMA_HOST: "http://127.0.0.1:11434" }, async () => new Response("ok"));
    expect(live.mode).toBe("live");
    const mock = await selectAdapter({ MOCK: "1", OLLAMA_HOST: "http://127.0.0.1:11434" }, async () => new Response("ok"));
    expect(mock.mode).toBe("mock");
  });
});
