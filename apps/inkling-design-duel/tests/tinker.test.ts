import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { modelCandidates } from "../server/adapter/models.ts";
import {
  ANTHROPIC_MAX_TOKENS,
  anthropicMessagesUrl,
  buildAnthropicBody,
  buildOpenAIBody,
} from "../server/adapter/tinker.ts";
import { selectAdapter } from "../server/mode.ts";
import { ANTHROPIC_BASE_URL, MODEL_BASE, MODEL_SERVERLESS, OPENAI_BASE_URL } from "../shared/duel.ts";

const png = "data:image/png;base64,aaaa";

describe("tinker adapter shape", () => {
  test("model try order is the override, then the two documented Inkling 2 Small ids", () => {
    expect(modelCandidates({})).toEqual([MODEL_BASE, MODEL_SERVERLESS]);
    expect(modelCandidates({ TINKER_MODEL: "thinkingmachines/custom" })).toEqual([
      "thinkingmachines/custom",
      MODEL_BASE,
      MODEL_SERVERLESS,
    ]);
    expect(modelCandidates({ TINKER_MODEL: MODEL_BASE })).toEqual([MODEL_BASE, MODEL_SERVERLESS]);
  });

  test("openai body sends float effort and separate_reasoning, not guessed sampling defaults", () => {
    const low = buildOpenAIBody({ prompt: "pricing page", effort: "low" }, MODEL_BASE);
    const high = buildOpenAIBody(
      { prompt: "pricing page", effort: "high", imageDataUrl: png },
      MODEL_SERVERLESS,
    );
    expect(low.reasoning_effort).toBe(0.2);
    expect(high.reasoning_effort).toBe(0.9);
    expect(low.separate_reasoning).toBe(true);
    expect(high.separate_reasoning).toBe(true);
    expect(low).not.toHaveProperty("temperature");
    expect(low).not.toHaveProperty("top_p");
    expect(low.model).toBe(MODEL_BASE);
    const content = (high.messages as Array<{ content: unknown }>)[1]?.content as Array<{
      type: string;
      image_url?: { url: string };
    }>;
    expect(content[1]).toEqual({ type: "image_url", image_url: { url: png } });
  });

  test("anthropic fallback uses named effort and a base64 image", () => {
    const body = buildAnthropicBody(
      { prompt: "settings panel", effort: "high", imageDataUrl: png },
      MODEL_BASE,
    );
    expect(body.max_tokens).toBe(ANTHROPIC_MAX_TOKENS);
    expect(body.output_config).toEqual({ effort: "high" });
    expect(anthropicMessagesUrl()).toBe(`${ANTHROPIC_BASE_URL}/v1/messages`);
    const content = (body.messages as Array<{ content: unknown }>)[0]?.content as Array<{
      type: string;
      source?: { type: string; media_type: string; data: string };
    }>;
    expect(content[1]?.source).toEqual({
      type: "base64",
      media_type: "image/png",
      data: "aaaa",
    });
    expect(OPENAI_BASE_URL.endsWith("/v1")).toBe(true);
  });

  test("missing key stays on the mock adapter", () => {
    expect(selectAdapter({}).mode).toBe("mock");
    expect(selectAdapter({ TINKER_API_KEY: "   " }).mode).toBe("mock");
    expect(selectAdapter({ TINKER_API_KEY: "test-key" }).mode).toBe("live");
  });

  test("the preview iframe does not opt into allow-same-origin", () => {
    const source = readFileSync(new URL("../src/desk/DuelPane.tsx", import.meta.url), "utf8");
    expect(source).toContain("sandbox={IFRAME_SANDBOX}");
    expect(source).not.toContain("allow-same-origin");
  });
});
