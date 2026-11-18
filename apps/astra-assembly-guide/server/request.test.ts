import { describe, expect, test } from "bun:test";
import { zodTextFormat } from "openai/helpers/zod";

import { KITS } from "../shared/fixtures/kits.ts";
import { assemblySchema } from "../shared/schema.ts";
import { actualTierNote, buildResponsesParams, DEVELOPER_INSTRUCTIONS } from "./adapter/openai.ts";

describe("fixtures", () => {
  test("both kits parse and Astra differs from Sol", () => {
    expect(KITS).toHaveLength(2);
    for (const kit of KITS) {
      const astra = assemblySchema.parse(kit.assemblies.astra);
      const sol = assemblySchema.parse(kit.assemblies.sol);
      expect(astra.summary.toLowerCase()).toContain("hand-authored");
      expect(sol.parts.map((part) => part.id).join()).not.toBe(astra.parts.map((part) => part.id).join());
      for (const assembly of [astra, sol]) {
        const ids = new Set(assembly.parts.map((part) => part.id));
        expect(ids.size).toBe(assembly.parts.length);
        for (const step of assembly.steps) {
          for (const id of step.partIds) expect(ids.has(id)).toBe(true);
        }
      }
    }
  });
});

describe("responses request", () => {
  test("zod text format is strict json_schema", () => {
    const format = zodTextFormat(assemblySchema, "assembly");
    expect(format.type).toBe("json_schema");
    expect(format.name).toBe("assembly");
    expect(format.strict).toBe(true);
  });

  test("pins service_tier, low effort, and a developer message first", () => {
    const image = "data:image/png;base64,aaaa";
    const params = buildResponsesParams({
      model: "gpt-6.2-astra",
      serviceTier: "ultrafast",
      sourceText: "four legs and a top",
      imageDataUrl: image,
    });
    expect(params.model).toBe("gpt-6.2-astra");
    expect(params.service_tier).toBe("ultrafast");
    expect(params.reasoning).toEqual({ effort: "low" });
    expect(params).not.toHaveProperty("temperature");
    expect(params).not.toHaveProperty("top_p");
    expect(params).not.toHaveProperty("top_logprobs");
    const input = params.input;
    expect(Array.isArray(input)).toBe(true);
    if (!Array.isArray(input)) return;
    expect(input[0]).toMatchObject({ role: "developer", content: DEVELOPER_INSTRUCTIONS });
    const user = input[1];
    expect(user).toMatchObject({ role: "user" });
    if (!user || !("content" in user) || !Array.isArray(user.content)) {
      throw new Error("expected image content");
    }
    expect(user.content[1]).toMatchObject({
      type: "input_image",
      image_url: image,
      detail: "auto",
    });
  });

  test("text-only input stays a string and fast maps to fast", () => {
    const params = buildResponsesParams({
      model: "gpt-6.2-sol",
      serviceTier: "fast",
      sourceText: "a lamp",
    });
    expect(params.service_tier).toBe("fast");
    const input = params.input;
    if (!Array.isArray(input)) throw new Error("expected input array");
    expect(input[1]).toMatchObject({ role: "user", content: "a lamp" });
  });

  test("priority is described as the legacy Fast alias", () => {
    expect(actualTierNote("priority")).toContain("legacy alias of Fast");
    expect(actualTierNote("default")).toContain("differ from the request");
  });
});
