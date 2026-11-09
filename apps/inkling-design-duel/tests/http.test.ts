import { describe, expect, test } from "bun:test";

import { createMockAdapter } from "../server/adapter/mock.ts";
import { createApp } from "../server/http.ts";
import { MOCK_BANNER } from "../shared/duel.ts";

describe("duel http", () => {
  test("mock mode streams both recorded panes", async () => {
    const app = createApp(createMockAdapter({ delayMs: { low: 0, high: 0 } }));
    const mode = await app.handle(new Request("http://duel.local/api/mode"));
    expect(mode.status).toBe(200);
    const payload = (await mode.json()) as { mode: string; banner: string };
    expect(payload.mode).toBe("mock");
    expect(payload.banner).toBe(MOCK_BANNER);

    const duel = await app.handle(
      new Request("http://duel.local/api/duel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "pricing page for an AI API" }),
      }),
    );
    expect(duel.headers.get("content-type")).toContain("text/event-stream");
    const events = parseEvents(await duel.text());
    expect(events.map((event) => event.type)).toContain("meta");
    expect(events.some((event) => event.type === "meta" && event.banner === MOCK_BANNER)).toBe(true);
    const results = events.filter((event) => event.type === "result");
    expect(results).toHaveLength(2);
    const byEffort = Object.fromEntries(results.map((event) => [event.effort, event.result]));
    expect(byEffort.low?.latencyMs).toBe(840);
    expect(byEffort.low?.usage.promptTokens).toBe(420);
    expect(byEffort.low?.costUsd).toBe(0.000436);
    expect(byEffort.high?.latencyMs).toBe(3180);
    expect(byEffort.high?.usage.completionTokens).toBe(1640);
    expect(byEffort.high?.costUsd).toBe(0.001766);
    expect(byEffort.low?.html).toContain("pricing page for an AI API");
    expect(byEffort.high?.html).toContain("pricing page for an AI API");
    expect(byEffort.low?.source).toBe("mock");
    expect(events.at(-1)?.type).toBe("done");
  });

  test("rejects an empty prompt and a non-image sketch", async () => {
    const app = createApp(createMockAdapter({ delayMs: { low: 0, high: 0 } }));
    const empty = await app.handle(
      new Request("http://duel.local/api/duel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "   " }),
      }),
    );
    expect(empty.status).toBe(400);
    const sketch = await app.handle(
      new Request("http://duel.local/api/duel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "hello", imageDataUrl: "https://example.com/a.png" }),
      }),
    );
    expect(sketch.status).toBe(400);
  });
});

function parseEvents(body: string): Array<{
  type: string;
  banner?: string;
  effort?: string;
  result?: {
    latencyMs: number;
    costUsd: number;
    html: string;
    source: string;
    usage: { promptTokens: number; completionTokens: number };
  };
}> {
  return body
    .split("\n\n")
    .map((chunk) => chunk.replace(/^data: /, "").trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ReturnType<typeof parseEvents>[number]);
}
