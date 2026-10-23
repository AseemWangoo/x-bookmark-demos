import { expect, test } from "bun:test";
import { POST as postTriage } from "../api/triage.ts";
import { GET as getFixtures } from "../api/fixtures.ts";
import { GET as getMode } from "../api/mode.ts";
import { INBOX } from "../fixtures/messages.ts";
import { DECISIONS_CONCURRENCY, scheduledBatchMs } from "../src/lib/metrics.ts";
import type { TriageResponse } from "../src/lib/types.ts";
import { DECISION_SPECS } from "../fixtures/mock-decisions.ts";
import { executeDecisions } from "./runner.ts";
import { openaiConstructionCount, resetOpenAIConstructionCount } from "./openai.ts";

function request(body: unknown): Request {
  return new Request("http://localhost/api/triage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("mock triage never constructs an OpenAI client and hides the key", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousScale = process.env.MOCK_SLEEP_SCALE;
  delete process.env.OPENAI_API_KEY;
  process.env.MOCK_SLEEP_SCALE = "0";
  resetOpenAIConstructionCount();
  try {
    expect(await (await getMode()).json()).toEqual({ mode: "mock" });
    const fixtures = (await (await getFixtures()).json()) as Array<{ id: string }>;
    expect(fixtures.map((fixture) => fixture.id)).toEqual(INBOX.map((message) => message.id));

    const response = await postTriage(request({ messageIds: "all", strategy: "per_message", compare: true }));
    const body = (await response.json()) as TriageResponse;
    expect(response.status).toBe(200);
    expect(body.mode).toBe("mock");
    expect(body.decisions.synthetic).toBe(true);
    expect(body.responses?.synthetic).toBe(true);
    expect(body.responses?.reasoningEffort).toBe("none");
    expect(body.decisions.rows).toHaveLength(10);
    expect(body.decisions.rows.some((row) => row.answers.priority.refused)).toBe(true);
    expect(openaiConstructionCount()).toBe(0);
    expect(JSON.stringify(body)).not.toContain("sk-");
    expect(body.decisions.batchMs).toBe(
      scheduledBatchMs(
        DECISION_SPECS.map((spec) => spec.latencyMs),
        DECISIONS_CONCURRENCY,
      ),
    );

    const packed = await postTriage(request({ messageIds: "all", strategy: "packed", compare: false }));
    const packedBody = (await packed.json()) as TriageResponse;
    expect(packedBody.responses).toBeUndefined();
    expect(packedBody.decisions.rows).toHaveLength(10);
    expect(packedBody.decisions.rows.every((row) => row.latencyMs === packedBody.decisions.batchMs)).toBe(true);
    expect(openaiConstructionCount()).toBe(0);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousScale === undefined) delete process.env.MOCK_SLEEP_SCALE;
    else process.env.MOCK_SLEEP_SCALE = previousScale;
  }
});

test("mode and forced mock never echo OPENAI_API_KEY", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousScale = process.env.MOCK_SLEEP_SCALE;
  process.env.OPENAI_API_KEY = "sk-test-secret-value";
  process.env.MOCK_SLEEP_SCALE = "0";
  resetOpenAIConstructionCount();
  try {
    const mode = await (await getMode()).json();
    expect(mode).toEqual({ mode: "live" });
    expect(JSON.stringify(mode)).not.toContain("sk-test-secret-value");

    const response = await postTriage(
      request({ messageIds: "all", strategy: "per_message", compare: false, forceMock: true }),
    );
    const body = (await response.json()) as TriageResponse;
    expect(body.mode).toBe("mock");
    expect(body.decisions.synthetic).toBe(true);
    expect(openaiConstructionCount()).toBe(0);
    expect(JSON.stringify(body)).not.toContain("sk-test-secret-value");
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousScale === undefined) delete process.env.MOCK_SLEEP_SCALE;
    else process.env.MOCK_SLEEP_SCALE = previousScale;
  }
});

test("triage rejects oversized batches and unknown ids", async () => {
  const previousScale = process.env.MOCK_SLEEP_SCALE;
  process.env.MOCK_SLEEP_SCALE = "0";
  try {
    const unknown = await postTriage(request({ messageIds: ["nope"], strategy: "per_message", compare: false }));
    expect(unknown.status).toBe(400);

    const packed = await postTriage(
      request({
        messageIds: Array.from({ length: 134 }, () => "m1"),
        strategy: "packed",
        compare: false,
      }),
    );
    expect(packed.status).toBe(400);
    const packedBody = (await packed.json()) as { error: string };
    expect(packedBody.error).toContain("400");

    const perMessage = await postTriage(
      request({
        messageIds: Array.from({ length: 51 }, () => "m1"),
        strategy: "per_message",
        compare: false,
      }),
    );
    expect(perMessage.status).toBe(400);

    const huge = await postTriage(
      new Request("http://localhost/api/triage", {
        method: "POST",
        body: "x".repeat(256_001),
      }),
    );
    expect(huge.status).toBe(413);
  } finally {
    if (previousScale === undefined) delete process.env.MOCK_SLEEP_SCALE;
    else process.env.MOCK_SLEEP_SCALE = previousScale;
  }
});

test("one upstream failure leaves the rest of the batch", async () => {
  const messages = INBOX.slice(0, 3);
  const result = await executeDecisions({
    messages,
    strategy: "per_message",
    synthetic: false,
    secret: "sk-test-secret-value",
    perMessage: async (message) => {
      if (message.id === "m2") {
        const error = new Error("rate limited sk-test-secret-value") as Error & { status: number };
        error.status = 429;
        throw error;
      }
      return {
        raw: {
          model: "gpt-6-luna",
          usage: {
            input_tokens: 1,
            input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
            output_tokens: 0,
            output_tokens_details: { reasoning_tokens: 0 },
            total_tokens: 1,
          },
          answers: [{ type: "predicate", name: "urgent", probability: 0.1 }],
        },
        latencyMs: 12,
      };
    },
    packed: async () => {
      throw new Error("unused");
    },
  });
  expect(result.rows.map((row) => row.id)).toEqual(["m1", "m3"]);
  expect(result.errors).toEqual([
    { id: "m2", source: "decisions", status: 429, message: "rate limited [redacted]" },
  ]);
});
