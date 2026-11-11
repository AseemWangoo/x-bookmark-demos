import { readFileSync } from "node:fs";

import { z } from "zod";

import type { Effort, FixtureSummary, PortRequest, PortResult } from "../../shared/port.ts";
import { DEFAULT_MODEL, normalizeSource } from "../../shared/port.ts";
import { costUsd, estimateTokens } from "../cost.ts";
import { buildPrompt, PORT_INSTRUCTIONS } from "../prompts.ts";
import type { PortAdapter } from "./types.ts";
import { templateHtml, templateLatency } from "./template.ts";

const portMetaSchema = z.object({
  htmlFile: z.string(),
  latencyMs: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
});

const fixtureSchema = z.object({
  id: z.string(),
  title: z.string(),
  language: z.string(),
  sourceFile: z.string(),
  ports: z.object({
    low: portMetaSchema,
    medium: portMetaSchema,
    high: portMetaSchema,
  }),
});

const catalogSchema = z.object({
  fixtures: z.array(fixtureSchema).min(1),
});

type Fixture = z.infer<typeof fixtureSchema> & { source: string };

const fixturesDir = new URL("../../shared/fixtures/", import.meta.url);

function readFixture(name: string): string {
  return readFileSync(new URL(name, fixturesDir), "utf8");
}

const catalog = catalogSchema.parse(JSON.parse(readFixture("meta.json")));

const fixtures: Fixture[] = catalog.fixtures.map((fixture) => ({
  ...fixture,
  source: readFixture(fixture.sourceFile).replaceAll("\r\n", "\n").trim(),
}));

export function listFixtures(): FixtureSummary[] {
  return fixtures.map((fixture) => ({
    id: fixture.id,
    title: fixture.title,
    language: fixture.language,
    source: fixture.source,
  }));
}

export function createMockAdapter(options?: { model?: string }): PortAdapter {
  const model = options?.model?.trim() || DEFAULT_MODEL;
  return {
    mode: "mock",
    model,
    port(request) {
      return Promise.resolve(portMock(request, model));
    },
  };
}

function portMock(request: PortRequest, model: string): PortResult {
  const fixture = fixtures.find(
    (item) => normalizeSource(item.source) === normalizeSource(request.source),
  );
  if (!fixture) return templatePort(request, model);
  const meta = fixture.ports[request.effort];
  const html = readFixture(meta.htmlFile);
  return {
    html,
    latencyMs: meta.latencyMs,
    usage: {
      inputTokens: meta.inputTokens,
      outputTokens: meta.outputTokens,
      cachedInputTokens: meta.cachedInputTokens,
      reasoningTokens: meta.reasoningTokens,
      estimated: false,
    },
    costUsd: costUsd({
      inputTokens: meta.inputTokens,
      outputTokens: meta.outputTokens,
      cachedInputTokens: meta.cachedInputTokens,
    }),
    source: "mock",
    effort: request.effort,
    model,
    notes: [],
  };
}

function templatePort(request: PortRequest, model: string): PortResult {
  const html = templateHtml(request.source, request.effort);
  const prompt = `${PORT_INSTRUCTIONS}\n${buildPrompt(request)}`;
  const usage = {
    inputTokens: estimateTokens(prompt),
    outputTokens: estimateTokens(html),
    cachedInputTokens: 0,
    reasoningTokens: null,
    estimated: true,
  };
  return {
    html,
    latencyMs: templateLatency(request.effort),
    usage,
    costUsd: costUsd(usage),
    source: "mock",
    effort: request.effort,
    model,
    notes: [
      "Recorded usage was not available for this paste. Tokens are a labelled estimate of about 4 characters per token.",
    ],
  };
}

export function recordedPorts(): Array<{ id: string; effort: Effort; costUsd: number; metaCostUsd: number }> {
  return fixtures.flatMap((fixture) =>
    (["low", "medium", "high"] as const).map((effort) => {
      const meta = fixture.ports[effort];
      return {
        id: fixture.id,
        effort,
        costUsd: costUsd(meta),
        metaCostUsd: meta.costUsd,
      };
    }),
  );
}
