import { describe, expect, test } from "bun:test";

import { createMockBackend } from "../server/backend/mock.ts";
import { createManualClock } from "../server/clock.ts";
import { createApp } from "../server/http.ts";
import { selectDesk } from "../server/mode.ts";
import { SIMULATED_BANNER } from "../shared/desk.ts";

describe("desk http", () => {
  test("mode and chat stay on the simulated backend", async () => {
    const backend = createMockBackend({
      clock: createManualClock(1_700_000_000_000),
      tokenDelayMs: 0,
    });
    const app = createApp(backend);
    const mode = await app.handle(new Request("http://desk.local/api/mode"));
    expect(mode.status).toBe(200);
    const payload = (await mode.json()) as { banner: string; simulated: boolean; tools: string[] };
    expect(payload.simulated).toBe(true);
    expect(payload.banner).toBe(SIMULATED_BANNER);
    expect(payload.tools).not.toContain("task");

    const chat = await app.handle(
      new Request("http://desk.local/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "Write a competitive research brief on async agent runtimes.",
        }),
      }),
    );
    expect(chat.headers.get("content-type")).toContain("text/event-stream");
    const body = await chat.text();
    expect(body).toContain("start_async_task");
    expect(body).toContain(SIMULATED_BANNER);
    expect(body).not.toContain("check_async_task");

    const tasks = await app.handle(new Request("http://desk.local/api/tasks"));
    const list = (await tasks.json()) as { taskId: string; status: string }[];
    expect(list).toHaveLength(1);
    const cancelled = await app.handle(
      new Request(`http://desk.local/api/tasks/${list[0]!.taskId}/cancel`, { method: "POST" }),
    );
    expect(cancelled.status).toBe(200);
    const after = (await cancelled.json()) as { status: string; lastAction: string };
    expect(after.status).toBe("cancelled");
    expect(after.lastAction).toBe("cancel_async_task");
  });
});

describe("mode selection", () => {
  test("defaults to mock and requires a URL for live", () => {
    expect(selectDesk({ env: {}, argv: [] }).kind).toBe("mock");
    expect(
      selectDesk({
        env: { LANGGRAPH_API_URL: "http://127.0.0.1:2024", ANTHROPIC_API_KEY: "test" },
        argv: [],
      }).kind,
    ).toBe("live");
    expect(
      selectDesk({
        env: { MOCK: "1", LANGGRAPH_API_URL: "http://127.0.0.1:2024", OPENAI_API_KEY: "test" },
        argv: ["--live"],
      }).kind,
    ).toBe("mock");
    const missing = selectDesk({ env: { DESK_MODE: "live" }, argv: [] });
    expect(missing.kind).toBe("invalid");
  });
});
