import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { SUMMARY_FILENAME } from "../shared/copy.ts";
import type { AgentEvent } from "../shared/types.ts";
import { parseToolArguments } from "./agent.ts";
import { runLive } from "./adapter/local.ts";
import { readEnv } from "./env.ts";

function chunk(delta: Record<string, unknown>, finish: string | null = null): unknown {
  return {
    id: "chatcmpl-test",
    object: "chat.completion.chunk",
    created: 0,
    model: "inkling-2-mini",
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finish,
      },
    ],
  };
}

function sse(chunks: unknown[], usage?: { prompt_tokens: number; completion_tokens: number }): Response {
  const lines = chunks.map((item) => `data: ${JSON.stringify(item)}\n\n`);
  if (usage) {
    lines.push(
      `data: ${JSON.stringify({
        id: "chatcmpl-test",
        object: "chat.completion.chunk",
        created: 0,
        model: "inkling-2-mini",
        choices: [],
        usage: { ...usage, total_tokens: usage.prompt_tokens + usage.completion_tokens },
      })}\n\n`,
    );
  }
  lines.push("data: [DONE]\n\n");
  return new Response(lines.join(""), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function toolChunk(name: string, args: string, id: string): unknown {
  return chunk({
    tool_calls: [
      {
        index: 0,
        id,
        type: "function",
        function: { name, arguments: args },
      },
    ],
  });
}

describe("local adapter", () => {
  test("parses object and string arguments and rejects free-form text", () => {
    expect(parseToolArguments({ path: "a.md" })).toEqual({ path: "a.md" });
    expect(parseToolArguments('{"path":"a.md"}')).toEqual({ path: "a.md" });
    expect(() => parseToolArguments("please read the files")).toThrow();
  });

  test("does not call fetch unless the base URL is loopback", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return new Response("nope", { status: 500 });
    }) as unknown as typeof fetch;
    const env = readEnv({
      LOCAL_LLM_BASE_URL: "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1",
    });
    const pending = runLive({ root: "/tmp", env, fetchImpl });
    await expect(pending.next()).rejects.toThrow(/loopback|offline badge/i);
    expect(called).toBe(false);
  });

  test("loops tool calls against a fake loopback stream and records TTFT", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "pocket-live-"));
    await writeFile(path.join(root, "note.md"), "local note\n");
    const bodies: Array<Record<string, unknown>> = [];
    let calls = 0;
    const fetchImpl = (async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      expect(href.startsWith("http://127.0.0.1:11434/v1/")).toBe(true);
      const raw = typeof init?.body === "string" ? init.body : "{}";
      const body = JSON.parse(raw) as Record<string, unknown>;
      bodies.push(body);
      calls += 1;
      if (calls === 1) {
        return sse(
          [toolChunk("list_files", "{}", "call_list"), chunk({}, "tool_calls")],
          { prompt_tokens: 20, completion_tokens: 8 },
        );
      }
      if (calls === 2) {
        return sse(
          [
            toolChunk(
              "write_summary",
              JSON.stringify({ markdown: "# From the loop\n" }),
              "call_sum",
            ),
            chunk({}, "tool_calls"),
          ],
          { prompt_tokens: 30, completion_tokens: 12 },
        );
      }
      return sse([chunk({ content: "done" }, "stop")], { prompt_tokens: 5, completion_tokens: 2 });
    }) as typeof fetch;

    const env = readEnv({
      LOCAL_LLM_BASE_URL: "http://127.0.0.1:11434/v1",
      LOCAL_LLM_MODEL: "inkling-2-mini",
      LOCAL_LLM_REASONING_EFFORT: "low",
    });
    const events: AgentEvent[] = [];
    for await (const event of runLive({ root, env, fetchImpl })) events.push(event);
    const first = bodies[0];
    expect(first?.model).toBe("inkling-2-mini");
    expect(first?.reasoning_effort).toBe("low");
    const tools = first?.tools as Array<{ function: { name: string } }>;
    expect(tools.map((tool) => tool.function.name).sort()).toEqual([
      "list_files",
      "read_file",
      "tag_file",
      "write_summary",
    ]);
    const done = events.find((event) => event.type === "result");
    if (!done || done.type !== "result") throw new Error("missing result");
    expect(done.result.offline).toBe(true);
    expect(done.result.source).toBe("live");
    expect(done.result.recorded).toBe(false);
    expect(done.result.ttftMs).not.toBeNull();
    expect(done.result.summaryPath).toBe(SUMMARY_FILENAME);
    expect(done.result.usage?.outputTokens).toBe(20);
    expect(done.result.tokensPerSec).not.toBeNull();
    const written = await Bun.file(path.join(root, SUMMARY_FILENAME)).text();
    expect(written).toContain("From the loop");
    expect(calls).toBe(2);
  });
});
