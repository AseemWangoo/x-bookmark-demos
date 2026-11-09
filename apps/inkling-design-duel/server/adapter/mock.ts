import { join } from "node:path";

import { costUsd } from "../cost.ts";
import { escapeHtml } from "../html.ts";
import { parseImageDataUrl } from "../image.ts";
import { effortValue, type EffortName, type GenerationResult } from "../../shared/duel.ts";
import type { DesignAdapter, GenerationRequest } from "./types.ts";

type FixtureMeta = {
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  reasoning: string;
};

type FixtureFile = {
  html: string;
  meta: FixtureMeta;
};

const DEFAULT_DELAY_MS: Record<EffortName, number> = { low: 700, high: 1600 };

export type MockAdapterOptions = {
  delayMs?: Partial<Record<EffortName, number>>;
};

export function createMockAdapter(options: MockAdapterOptions = {}): DesignAdapter {
  const delays: Record<EffortName, number> = {
    low: options.delayMs?.low ?? DEFAULT_DELAY_MS.low,
    high: options.delayMs?.high ?? DEFAULT_DELAY_MS.high,
  };
  return {
    mode: "mock",
    async generate(request) {
      await wait(delays[request.effort]);
      return recordedResult(request);
    },
  };
}

export async function recordedResult(request: GenerationRequest): Promise<GenerationResult> {
  const fixture = await readFixture(request.effort);
  const usage = {
    promptTokens: fixture.meta.promptTokens,
    completionTokens: fixture.meta.completionTokens,
    cachedPromptTokens: 0,
    estimated: false,
  };
  return {
    html: fillFixture(fixture.html, request),
    reasoning: fixture.meta.reasoning,
    latencyMs: fixture.meta.latencyMs,
    usage,
    costUsd: costUsd(usage),
    source: "mock",
    effort: request.effort,
    effortValue: effortValue(request.effort),
  };
}

function fillFixture(template: string, request: GenerationRequest): string {
  return template
    .replaceAll("{{PROMPT}}", escapeHtml(request.prompt))
    .replaceAll("{{SKETCH}}", sketchMarkup(request.imageDataUrl));
}

function sketchMarkup(dataUrl: string | undefined): string {
  if (!dataUrl) return "";
  const image = parseImageDataUrl(dataUrl);
  if (!image) return "";
  return `<figure class="sketch"><img alt="Uploaded sketch" src="data:${image.mediaType};base64,${image.data}" /><figcaption>Sketch attached. Recorded fixture — not sent to Tinker.</figcaption></figure>`;
}

async function readFixture(effort: EffortName): Promise<FixtureFile> {
  const dir = join(import.meta.dir, "../../shared/fixtures");
  const html = await Bun.file(join(dir, `${effort}.html`)).text();
  const metaFile = (await Bun.file(join(dir, "meta.json")).json()) as Record<string, FixtureMeta>;
  const meta = metaFile[effort];
  if (!meta) throw new Error(`Missing recorded meta for ${effort}.`);
  return { html, meta };
}

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
