import { describe, expect, test } from "bun:test";

import { PHOTO_MOCK_MESSAGE } from "../shared/copy.ts";
import { RC_BUGGY_TEXT } from "../shared/fixtures/kits.ts";
import { recordedMetrics } from "../shared/fixtures.ts";
import { assemblySchema } from "../shared/schema.ts";
import { createMockAdapter } from "./adapter/mock.ts";
import { AssembleError } from "./adapter/types.ts";
import { costUsd } from "./cost.ts";
import { createApp } from "./http.ts";
import { modePayload } from "./mode.ts";

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("mock adapter", () => {
  test("replays distinct hand-authored assemblies and reprices the selected tier", async () => {
    const adapter = createMockAdapter({});
    const astra = await adapter.run({
      modelKey: "astra",
      serviceTier: "default",
      sourceText: RC_BUGGY_TEXT,
    });
    const sol = await adapter.run({
      modelKey: "sol",
      serviceTier: "ultrafast",
      sourceText: RC_BUGGY_TEXT,
      fixtureId: "rc-buggy",
    });
    expect(astra.source).toBe("mock");
    expect(astra.model).toBe("gpt-6.2-astra");
    expect(sol.model).toBe("gpt-6.2-sol");
    expect(astra.assembly.title).not.toBe(sol.assembly.title);
    expect(astra.assembly.parts.some((part) => part.id === "rollbar")).toBe(true);
    expect(sol.assembly.parts.some((part) => part.id === "spoiler")).toBe(true);
    expect(astra.assembly.parts.some((part) => part.id === "spoiler")).toBe(false);
    expect(assemblySchema.parse(astra.assembly).parts.length).toBeGreaterThan(0);
    const recorded = recordedMetrics("rc-buggy", "astra");
    expect(astra.costUsd).toBe(recorded.costUsd);
    expect(astra.costUsd).toBe(costUsd("astra", "default", recorded.usage).usd);
    expect(sol.ultrafastPromo).toBe(true);
    expect(sol.costMultiplier).toBe(3);
    expect(sol.actualTier).toBe("ultrafast");
    expect(sol.latencyMs).toBeLessThan(recordedMetrics("rc-buggy", "sol").latencyMs);
  });

  test("refuses an uploaded photo and an unknown list", async () => {
    const adapter = createMockAdapter({});
    await expect(
      adapter.run({
        modelKey: "astra",
        serviceTier: "default",
        sourceText: RC_BUGGY_TEXT,
        imageDataUrl: tinyPng,
      }),
    ).rejects.toThrow(PHOTO_MOCK_MESSAGE);
    try {
      await adapter.run({
        modelKey: "sol",
        serviceTier: "fast",
        sourceText: "a bookshelf I just made up",
      });
      throw new Error("expected a rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(AssembleError);
      expect((error as AssembleError).status).toBe(422);
    }
  });
});

describe("http", () => {
  test("mode payload never includes the key", async () => {
    const secret = "sk-test-secret-value";
    const env = { OPENAI_API_KEY: secret, MOCK: "1" };
    const payload = modePayload(env);
    expect(payload.mode).toBe("mock");
    expect(payload.banner).toBe("Mock mode — recorded outputs, no OpenAI calls");
    expect(JSON.stringify(payload)).not.toContain(secret);
    expect(payload).not.toHaveProperty("apiKey");
    const response = await createApp(createMockAdapter(env), env).handle(
      new Request("http://127.0.0.1/api/mode"),
    );
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain(secret);
  });

  test("assemble returns both panes for a fixture and 422 for a photo", async () => {
    const app = createApp(createMockAdapter({}));
    const ok = await app.handle(
      new Request("http://127.0.0.1/api/assemble", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceText: RC_BUGGY_TEXT,
          models: ["astra", "sol"],
          serviceTier: "default",
        }),
      }),
    );
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { results: { source: string }[] };
    expect(body.results).toHaveLength(2);
    expect(body.results[0]?.source).toBe("mock");
    const photo = await app.handle(
      new Request("http://127.0.0.1/api/assemble", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: tinyPng,
          models: ["astra"],
          serviceTier: "fast",
        }),
      }),
    );
    expect(photo.status).toBe(422);
    const photoBody = (await photo.json()) as { error?: string; results?: unknown };
    expect(photoBody.error).toBe(PHOTO_MOCK_MESSAGE);
    expect(photoBody.results).toBeUndefined();
  });

  test("live mode is selected when a key is set and MOCK is not", () => {
    const payload = modePayload({ OPENAI_API_KEY: "sk-live-not-sent" });
    expect(payload.mode).toBe("live");
    expect(JSON.stringify(payload)).not.toContain("sk-live-not-sent");
    expect(payload.models.astra).toBe("gpt-6.2-astra");
    expect(payload.reasoningEffort).toBe("low");
  });
});
