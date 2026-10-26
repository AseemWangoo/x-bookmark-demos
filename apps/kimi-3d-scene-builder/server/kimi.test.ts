import { expect, test } from "bun:test";
import type OpenAI from "openai";
import { estimateCostUsd } from "../src/lib/pricing.ts";
import type { NormalizedUsage } from "../src/lib/types.ts";
import {
  buildChatRequest,
  KIMI_MODELS,
  mapKimiError,
  normalizeUsage,
  parseSseText,
  streamChat,
} from "./kimi.ts";

const SSE = [
  'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":"Let me "},"finish_reason":null}]}',
  "",
  'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"reasoning_content":"think."},"finish_reason":null}]}',
  "",
  'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"const THREE = kit.THREE;\\n"},"finish_reason":null}]}',
  "",
  'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
  "",
  'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30,"completion_tokens_details":{"reasoning_tokens":5},"prompt_tokens_details":{"cached_tokens":2,"cache_write_tokens":3}}}',
  "",
  "data: [DONE]",
  "",
].join("\n");

test("parseSseText folds reasoning, content, empty-choices usage, and DONE", () => {
  const parsed = parseSseText(SSE);
  expect(parsed.incomplete).toBe(false);
  expect(parsed.reasoning).toBe("Let me think.");
  expect(parsed.content).toBe("const THREE = kit.THREE;\n");
  expect(parsed.finishReason).toBe("stop");
  expect(parsed.usage).toEqual({
    prompt: 10,
    cached: 2,
    cacheWrite: 3,
    uncached: 5,
    completion: 20,
    reasoning: 5,
    total: 30,
  });
});

test("parseSseText reads usage on choices[0] and flags a cut stream", () => {
  const text = [
    'data: {"choices":[{"index":0,"delta":{"content":"kit.scene;"},"finish_reason":"stop","usage":{"prompt_tokens":4,"completion_tokens":2,"total_tokens":6,"completion_tokens_details":{"reasoning_tokens":1},"prompt_tokens_details":{"cache_write_tokens":4}}}]}',
    "",
  ].join("\n");
  const parsed = parseSseText(text);
  expect(parsed.incomplete).toBe(true);
  expect(parsed.content).toBe("kit.scene;");
  expect(parsed.usage.cached).toBe(0);
  expect(parsed.usage.cacheWrite).toBe(4);
  expect(parsed.usage.uncached).toBe(0);
  expect(parsed.usage.reasoning).toBe(1);
});

test("streamChat folds reasoning, content, and a final empty choices chunk", async () => {
  const clock = { t: 0 };
  const now = () => clock.t;
  async function* chunks() {
    clock.t = 12;
    yield { choices: [{ delta: { reasoning_content: "plan " }, finish_reason: null }] };
    clock.t = 18;
    yield { choices: [{ delta: { reasoning_content: "the island" }, finish_reason: null }] };
    clock.t = 30;
    yield { choices: [{ delta: { content: "const THREE = kit.THREE;" }, finish_reason: "stop" }] };
    clock.t = 44;
    yield {
      choices: [],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 8,
        total_tokens: 18,
        completion_tokens_details: { reasoning_tokens: 3 },
        prompt_tokens_details: { cache_write_tokens: 1 },
      },
    };
  }
  const events: string[] = [];
  const client = {
    chat: {
      completions: {
        create: async () => chunks(),
      },
    },
  } as unknown as OpenAI;
  const fold = await streamChat(
    client,
    buildChatRequest({
      model: "pro",
      effort: "high",
      messages: [{ role: "user", content: "hi" }],
      maxCompletionTokens: 32,
    }),
    (event) => events.push(`${event.type}:${event.text}`),
    now,
  );
  expect(events).toEqual(["reasoning:plan ", "reasoning:the island", "content:const THREE = kit.THREE;"]);
  expect(fold.reasoning).toBe("plan the island");
  expect(fold.content).toBe("const THREE = kit.THREE;");
  expect(fold.ttftMs).toBe(12);
  expect(fold.firstContentMs).toBe(30);
  expect(fold.totalMs).toBe(44);
  expect(fold.incomplete).toBe(false);
  expect(fold.finishReason).toBe("stop");
  expect(fold.usage.cached).toBe(0);
  expect(fold.usage.uncached).toBe(9);
  expect(fold.usage.reasoning).toBe(3);
});

test("buildChatRequest maps models and omits fixed sampling params", () => {
  const body = buildChatRequest({
    model: "highspeed",
    effort: "max",
    messages: [{ role: "system", content: "sys" }],
    maxCompletionTokens: 32768,
  });
  expect(body.model).toBe(KIMI_MODELS.highspeed);
  expect(body.model).toBe("kimi-k3.1-pro-highspeed");
  expect(buildChatRequest({
    model: "pro",
    effort: "low",
    messages: [],
    maxCompletionTokens: 10,
  }).model).toBe("kimi-k3.1-pro");
  expect(body.stream).toBe(true);
  expect(body.stream_options).toEqual({ include_usage: true });
  expect(body.reasoning_effort).toBe("max");
  expect(body.max_completion_tokens).toBe(32768);
  for (const key of ["temperature", "top_p", "n", "presence_penalty", "frequency_penalty", "thinking"]) {
    expect(key in body).toBe(false);
  }
});

test("normalizeUsage and pricing bill cache once and skip a second reasoning charge", () => {
  expect(normalizeUsage(undefined)).toEqual({
    prompt: 0,
    cached: 0,
    cacheWrite: 0,
    uncached: 0,
    completion: 0,
    reasoning: 0,
    total: 0,
  });
  const partial = normalizeUsage({
    prompt_tokens: 10,
    completion_tokens: 4,
    prompt_tokens_details: { cache_write_tokens: 3 },
  });
  expect(partial.cached).toBe(0);
  expect(partial.cacheWrite).toBe(3);
  expect(partial.uncached).toBe(7);
  expect(partial.total).toBe(14);

  const over = normalizeUsage({
    prompt_tokens: 5,
    prompt_tokens_details: { cached_tokens: 4, cache_write_tokens: 4 },
    completion_tokens: 1,
  });
  expect(over.uncached).toBe(0);

  const uncached: NormalizedUsage = {
    prompt: 1_000_000,
    cached: 0,
    cacheWrite: 0,
    uncached: 1_000_000,
    completion: 1_000_000,
    reasoning: 200_000,
    total: 2_000_000,
  };
  expect(estimateCostUsd("pro", uncached)).toBeCloseTo(12);
  expect(estimateCostUsd("highspeed", uncached)).toBeCloseTo(24);
  expect(estimateCostUsd("highspeed", uncached)).toBeCloseTo(estimateCostUsd("pro", uncached) * 2);

  const cachedOnly: NormalizedUsage = {
    prompt: 1_000_000,
    cached: 1_000_000,
    cacheWrite: 0,
    uncached: 0,
    completion: 0,
    reasoning: 0,
    total: 1_000_000,
  };
  expect(estimateCostUsd("pro", cachedOnly)).toBeCloseTo(0.2);
  expect(estimateCostUsd("highspeed", cachedOnly)).toBeCloseTo(0.2);
});

test("upstream errors map to readable messages", () => {
  expect(mapKimiError(401, undefined, "unauthorized")).toBe(
    "bad or mismatched key (platform.kimi.ai vs platform.kimi.com)",
  );
  expect(mapKimiError(404, "resource_not_found_error", "missing")).toBe(
    "model not available on this account (K3.1 Pro needs a $1 top-up)",
  );
  expect(mapKimiError(429, "rate_limit_reached_error", "slow down")).toBe("rate limited");
  expect(mapKimiError(500, undefined, "boom")).toBe("boom");
});
