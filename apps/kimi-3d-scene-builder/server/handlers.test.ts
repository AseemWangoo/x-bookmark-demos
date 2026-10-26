import { expect, test } from "bun:test";
import { GET as getExamples } from "../api/examples.ts";
import { GET as getMode } from "../api/mode.ts";
import { POST as postTurn } from "../api/turn.ts";
import { listExamples } from "../fixtures/mock-scenes.ts";
import { estimateCostUsd } from "../src/lib/pricing.ts";
import type { DoneEvent, TurnEvent } from "../src/lib/types.ts";
import { openaiConstructionCount, resetOpenAIConstructionCount } from "./kimi.ts";

function request(body: unknown): Request {
  return new Request("http://localhost/api/turn", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readEvents(response: Response): Promise<TurnEvent[]> {
  const text = await response.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TurnEvent);
}

test("mock turn streams synthetic events and never constructs a client", async () => {
  const previousKey = process.env.MOONSHOT_API_KEY;
  const previousScale = process.env.MOCK_SLEEP_SCALE;
  delete process.env.MOONSHOT_API_KEY;
  process.env.MOCK_SLEEP_SCALE = "0";
  resetOpenAIConstructionCount();
  try {
    const mode = await (await getMode()).json();
    expect(mode).toEqual({ mode: "mock" });
    expect(JSON.stringify(mode)).not.toContain("MOONSHOT");
    const examples = await (await getExamples()).json();
    expect(examples).toEqual(listExamples());

    const response = await postTurn(
      request({
        kind: "generate",
        prompt: "a low-poly lighthouse on a rocky island at sunset",
        model: "pro",
        effort: "high",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    const events = await readEvents(response);
    expect(events[0]).toMatchObject({ type: "start", synthetic: true, modelId: "kimi-k3.1-pro" });
    expect(events.some((event) => event.type === "reasoning")).toBe(true);
    expect(events.some((event) => event.type === "content")).toBe(true);
    const done = events.find((event): event is DoneEvent => event.type === "done");
    expect(done?.synthetic).toBe(true);
    expect(done?.code).toContain("scene:lighthouse");
    expect(done?.timings.totalMs).toBeGreaterThan(done?.timings ? 0 : 0);
    if (done) expect(done.costUsd).toBeCloseTo(estimateCostUsd("pro", done.usage));
    expect(openaiConstructionCount()).toBe(0);
    expect(JSON.stringify(events)).not.toContain("sk-");

    const free = await readEvents(
      await postTurn(request({ kind: "generate", prompt: "a dragon made of glass", model: "pro", effort: "low" })),
    );
    expect(free.some((event) => event.type === "done" || event.type === "content")).toBe(false);
    expect(free.find((event) => event.type === "error")).toMatchObject({
      message: "Mock mode only has the 3 example scenes; set MOONSHOT_API_KEY for live generation",
    });
    expect(openaiConstructionCount()).toBe(0);
  } finally {
    if (previousKey === undefined) delete process.env.MOONSHOT_API_KEY;
    else process.env.MOONSHOT_API_KEY = previousKey;
    if (previousScale === undefined) delete process.env.MOCK_SLEEP_SCALE;
    else process.env.MOCK_SLEEP_SCALE = previousScale;
  }
});

test("mode hides the key and forceMock stays synthetic", async () => {
  const previousKey = process.env.MOONSHOT_API_KEY;
  const previousScale = process.env.MOCK_SLEEP_SCALE;
  process.env.MOONSHOT_API_KEY = "sk-test-secret-value";
  process.env.MOCK_SLEEP_SCALE = "0";
  resetOpenAIConstructionCount();
  try {
    const mode = await (await getMode()).json();
    expect(mode).toEqual({ mode: "live" });
    expect(JSON.stringify(mode)).not.toContain("sk-test-secret-value");
    const response = await postTurn(
      request({
        kind: "generate",
        prompt: "a cozy campfire in a pine forest at night",
        model: "highspeed",
        effort: "max",
        forceMock: true,
      }),
    );
    const events = await readEvents(response);
    const done = events.find((event): event is DoneEvent => event.type === "done");
    expect(done?.synthetic).toBe(true);
    expect(done?.code).toContain("scene:campfire");
    expect(events[0]).toMatchObject({ modelId: "kimi-k3.1-pro-highspeed" });
    if (done) expect(done.timings.totalMs * 2.5).toBeGreaterThan(done.timings.ttftMs);
    expect(openaiConstructionCount()).toBe(0);
    expect(JSON.stringify(events)).not.toContain("sk-test-secret-value");
  } finally {
    if (previousKey === undefined) delete process.env.MOONSHOT_API_KEY;
    else process.env.MOONSHOT_API_KEY = previousKey;
    if (previousScale === undefined) delete process.env.MOCK_SLEEP_SCALE;
    else process.env.MOCK_SLEEP_SCALE = previousScale;
  }
});

test("invalid turn bodies return 400", async () => {
  const previousKey = process.env.MOONSHOT_API_KEY;
  delete process.env.MOONSHOT_API_KEY;
  try {
    expect((await postTurn(new Request("http://localhost/api/turn", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await postTurn(request({ kind: "generate", prompt: "", model: "pro", effort: "high" }))).status).toBe(400);
    expect((await postTurn(request({ kind: "generate", prompt: "x".repeat(2001), model: "pro", effort: "high" }))).status).toBe(
      400,
    );
    expect((await postTurn(request({ kind: "edit", prompt: "make the water reflective", model: "pro", effort: "high" }))).status).toBe(
      400,
    );
    const missingError = await postTurn(
      request({
        kind: "fix",
        prompt: "add seagulls",
        currentCode: "kit.scene;",
        model: "pro",
        effort: "high",
      }),
    );
    expect(missingError.status).toBe(400);
    expect(await missingError.json()).toEqual({ error: "error is required for fix" });
  } finally {
    if (previousKey === undefined) delete process.env.MOONSHOT_API_KEY;
    else process.env.MOONSHOT_API_KEY = previousKey;
  }
});
