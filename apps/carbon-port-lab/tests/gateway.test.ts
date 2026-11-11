import { describe, expect, test } from "bun:test";

import {
  buildGatewayCall,
  createGatewayAdapter,
  GATEWAY_TIMEOUT_MS,
  GatewayPortError,
  MAX_OUTPUT_TOKENS,
  type GatewayCall,
  type GatewayReply,
} from "../server/adapter/gateway.ts";
import { PORT_INSTRUCTIONS } from "../server/prompts.ts";
import { selectAdapter } from "../server/mode.ts";
import { createApp } from "../server/http.ts";
import { DEFAULT_MODEL } from "../shared/port.ts";

const HTML = "<!DOCTYPE html><html><body><canvas id=\"c\"></canvas></body></html>";

function reply(overrides?: Partial<GatewayReply>): GatewayReply {
  return {
    text: HTML,
    usage: {
      inputTokens: 100,
      outputTokens: 40,
      inputTokenDetails: { cacheReadTokens: 0 },
      outputTokenDetails: { reasoningTokens: 15 },
    },
    ...overrides,
  };
}

describe("gateway adapter", () => {
  test("requests thinkingLevel and never the top-level reasoning option", () => {
    for (const effort of ["low", "medium", "high"] as const) {
      const call = buildGatewayCall({ source: "x = 1", effort }, "google", DEFAULT_MODEL);
      expect(call.model).toBe("google/gemini-4-carbon");
      expect(call.instructions).toBe(PORT_INSTRUCTIONS);
      expect(call.maxOutputTokens).toBe(MAX_OUTPUT_TOKENS);
      expect(call.timeout).toBe(GATEWAY_TIMEOUT_MS);
      expect(call.providerOptions.google?.thinkingConfig.thinkingLevel).toBe(effort);
      expect(call.providerOptions.google?.thinkingConfig.includeThoughts).toBe(true);
      expect("reasoning" in call).toBe(false);
      expect("temperature" in call).toBe(false);
      expect("topP" in call).toBe(false);
      expect("topK" in call).toBe(false);
      expect("system" in call).toBe(false);
      expect(JSON.stringify(call)).not.toContain("thinkingBudget");
    }
  });

  test("maps usage to intro cost without billing reasoning twice", async () => {
    const calls: GatewayCall[] = [];
    const adapter = createGatewayAdapter({ AI_GATEWAY_API_KEY: "test-key" }, async (options) => {
      calls.push(options);
      return reply();
    });
    const result = await adapter.port({ source: "PRINT 1", effort: "medium" });
    expect(calls).toHaveLength(1);
    expect(result.source).toBe("live");
    expect(result.usage.reasoningTokens).toBe(15);
    expect(result.costUsd).toBe(0.0006);
    expect(result.html).toBe(HTML);
  });

  test("uses a clean vertex reply when google rejects thinkingConfig", async () => {
    const providers: string[] = [];
    const adapter = createGatewayAdapter({}, async (options) => {
      const provider = Object.keys(options.providerOptions)[0] ?? "";
      providers.push(provider);
      expect("reasoning" in options).toBe(false);
      if (provider === "google") throw new Error("thinkingConfig is not supported");
      return reply({ reasoningText: "planned the canvas" });
    });
    const result = await adapter.port({ source: "PRINT 1", effort: "high" });
    expect(providers).toEqual(["google", "vertex"]);
    expect(result.reasoning).toBe("planned the canvas");
    expect(result.notes[0]).toContain("providerOptions.vertex");
  });

  test("retries vertex when google rejects thinkingConfig, then stops if vertex does too", async () => {
    const providers: string[] = [];
    const adapter = createGatewayAdapter({}, async (options) => {
      providers.push(Object.keys(options.providerOptions)[0] ?? "");
      throw new Error(`unknown field thinkingConfig via ${providers.at(-1)}`);
    });
    await expect(adapter.port({ source: "PRINT 1", effort: "low" })).rejects.toBeInstanceOf(GatewayPortError);
    expect(providers).toEqual(["google", "vertex"]);
    try {
      await adapter.port({ source: "PRINT 1", effort: "low" });
    } catch (error) {
      expect(error).toBeInstanceOf(GatewayPortError);
      expect((error as Error).message).toContain("top-level AI SDK reasoning option");
      expect((error as Error).message).not.toContain("thinkingBudget");
    }
  });

  test("does not retry vertex for an auth failure", async () => {
    let calls = 0;
    const adapter = createGatewayAdapter({}, async () => {
      calls += 1;
      throw new Error("401 invalid api key");
    });
    await expect(adapter.port({ source: "PRINT 1", effort: "high" })).rejects.toThrow("401 invalid api key");
    expect(calls).toBe(1);
  });

  test("labels a missing usage payload as an estimate", async () => {
    const adapter = createGatewayAdapter({}, async () => reply({ usage: {} }));
    const result = await adapter.port({ source: "PRINT 1", effort: "medium" });
    expect(result.usage.estimated).toBe(true);
    expect(result.notes[0]).toContain("labelled estimate");
  });

  test("refuses to return a partial document", async () => {
    const adapter = createGatewayAdapter({}, async () =>
      reply({ text: "<!DOCTYPE html><html><body><canvas>" }),
    );
    await expect(adapter.port({ source: "PRINT 1", effort: "medium" })).rejects.toThrow(
      "complete HTML document",
    );
  });

  test("mock is the default without a key, and errors redact the key", async () => {
    expect(selectAdapter({}).mode).toBe("mock");
    expect(selectAdapter({ AI_GATEWAY_API_KEY: "   " }).mode).toBe("mock");
    expect(selectAdapter({ AI_GATEWAY_API_KEY: "present" }).mode).toBe("live");
    expect(selectAdapter({ AI_GATEWAY_MODEL: "google/gemini-4-carbon" }).model).toBe(
      "google/gemini-4-carbon",
    );

    const app = createApp(
      {
        mode: "live",
        model: DEFAULT_MODEL,
        port: () => Promise.reject(new Error("bad key sk-live-demo")),
      },
      { redacted: "sk-live-demo" },
    );
    const response = await app.handle(
      new Request("http://port.local/api/port", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "x", effort: "low" }),
      }),
    );
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("[redacted]");
    expect(body.error).not.toContain("sk-live-demo");
  });
});
