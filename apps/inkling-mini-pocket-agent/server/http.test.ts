import { describe, expect, test } from "bun:test";

import { HOSTED_BLOCKED, RECORDED_LABEL } from "../shared/copy.ts";
import type { AgentEvent, ModeReport } from "../shared/types.ts";
import { readEnv } from "./env.ts";
import { createApp } from "./http.ts";

function request(path: string, body?: unknown): Request {
  return new Request(`http://127.0.0.1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function readEvents(response: Response): Promise<AgentEvent[]> {
  const text = await response.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AgentEvent);
}

describe("http", () => {
  test("mode never returns the api key", async () => {
    const secret = "local-key-do-not-leak-zz";
    const env = readEnv({
      LOCAL_LLM_API_KEY: secret,
      LOCAL_LLM_BASE_URL: "http://127.0.0.1:11434/v1",
      LOCAL_LLM_MODEL: "inkling-2-mini",
    });
    const app = createApp(env);
    const response = await app.handle(request("/api/mode"));
    const payload = (await response.json()) as ModeReport;
    expect(response.status).toBe(200);
    expect(payload.mode).toBe("live");
    expect(payload.offline).toBe(true);
    expect(payload.endpointHost).toBe("127.0.0.1:11434");
    expect(payload.model).toBe("inkling-2-mini");
    expect(JSON.stringify(payload)).not.toContain(secret);
    expect(Object.keys(payload)).not.toContain("apiKey");

    const recorded = (await createApp(readEnv({})).handle(request("/api/mode")).then((res) => res.json())) as ModeReport;
    expect(recorded.mode).toBe("mock");
    expect(recorded.recordedLabel).toBe(RECORDED_LABEL);
    expect(recorded.offline).toBe(false);
  });

  test("a hosted URL stays offline-off and sends no completion", async () => {
    const env = readEnv({
      LOCAL_LLM_BASE_URL: "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1",
      LOCAL_LLM_API_KEY: "tinker-secret",
    });
    const app = createApp(env);
    const response = await app.handle(request("/api/run", { rootId: "fixture" }));
    expect(response.status).toBe(200);
    const events = await readEvents(response);
    const result = events.find((event) => event.type === "result");
    if (!result || result.type !== "result") throw new Error("missing result");
    expect(result.result.offline).toBe(false);
    expect(result.result.message).toBe(HOSTED_BLOCKED);
    expect(result.result.trace).toEqual([]);
    expect(JSON.stringify(events)).not.toContain("tinker-secret");
  });

  test("fixture files are listed and a recorded run streams tool calls", async () => {
    const app = createApp(readEnv({}));
    const listed = await app.handle(request("/api/files?rootId=fixture"));
    expect(listed.status).toBe(200);
    const body = (await listed.json()) as { files: Array<{ path: string }> };
    const paths = body.files.map((file) => file.path);
    expect(paths).toContain("grocery-list.md");
    expect(paths).toContain("hardware-receipt.png");
    expect(paths).not.toContain("pocket-summary.md");

    const run = await app.handle(request("/api/run", { rootId: "fixture" }));
    const events = await readEvents(run);
    const names = events.filter((event) => event.type === "trace").map((event) => (event.type === "trace" ? event.entry.name : ""));
    expect(names).toContain("list_files");
    expect(names).toContain("tag_file");
    expect(names).toContain("write_summary");
    const done = events.find((event) => event.type === "result");
    if (!done || done.type !== "result") throw new Error("missing result");
    expect(done.result.recorded).toBe(true);
    expect(done.result.offline).toBe(false);
    expect(done.result.summaryPath).toBe("pocket-summary.md");
  });
});
