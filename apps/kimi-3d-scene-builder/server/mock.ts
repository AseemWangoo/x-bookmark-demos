import { MOCK_SCENES } from "../fixtures/mock-scenes.ts";
import { estimateCostUsd } from "../src/lib/pricing.ts";
import type { TurnEvent, TurnKind, TurnRequest } from "../src/lib/types.ts";
import { mockSleepScale } from "./env.ts";
import { KIMI_MODELS, normalizeUsage, type RawUsage } from "./kimi.ts";
import type { MockStep } from "../fixtures/mock-scenes.ts";

export const MOCK_ONLY_MESSAGE =
  "Mock mode only has the 3 example scenes; set MOONSHOT_API_KEY for live generation";

export async function streamMockTurn(request: TurnRequest, send: (event: TurnEvent) => void): Promise<void> {
  send({
    type: "start",
    model: request.model,
    modelId: KIMI_MODELS[request.model],
    effort: request.effort,
    synthetic: true,
  });
  const step = matchMock(request);
  if (!step) {
    send({ type: "error", message: MOCK_ONLY_MESSAGE });
    return;
  }
  const scale = mockSleepScale();
  const timings = step.timings[request.model];
  const reasoningParts = chunk(step.reasoning, 48);
  const contentParts = chunk(`\`\`\`js\n${step.code}\n\`\`\``, 120);
  const slices = Math.max(1, reasoningParts.length + contentParts.length);
  const ttft = timings.ttftMs * scale;
  const rest = Math.max(0, timings.totalMs * scale - ttft);
  await sleep(ttft);
  for (let index = 0; index < reasoningParts.length; index += 1) {
    if (index > 0) await sleep(rest / slices);
    const text = reasoningParts[index];
    if (text) send({ type: "reasoning", text });
  }
  for (const text of contentParts) {
    await sleep(rest / slices);
    send({ type: "content", text });
  }
  const usage = normalizeUsage(step.usage as RawUsage);
  send({
    type: "done",
    code: step.code,
    usage,
    timings,
    costUsd: estimateCostUsd(request.model, usage),
    finishReason: "stop",
    synthetic: true,
  });
}

export function matchMock(request: TurnRequest): MockStep | null {
  const prompt = request.prompt.trim().toLowerCase();
  const kind: TurnKind = request.kind;
  switch (kind) {
    case "generate":
      return MOCK_SCENES.find((scene) => scene.prompt.toLowerCase() === prompt)?.generate ?? null;
    case "edit": {
      for (const scene of MOCK_SCENES) {
        const step = scene.editSteps.find((item) => item.prompt.toLowerCase() === prompt);
        if (!step) continue;
        if (sceneMarker(request.currentCode) === scene.id) return step;
        return null;
      }
      return null;
    }
    case "fix": {
      for (const scene of MOCK_SCENES) {
        if (!scene.fix) continue;
        const code = request.currentCode ?? "";
        const broken = scene.editSteps.find((step) => step.broken);
        if (broken && normalize(code) === normalize(broken.code)) return scene.fix;
        if (
          sceneMarker(code) === scene.id &&
          code.includes("InstancedMesh(wingGeo") &&
          (request.error?.message.includes("wingGeo") ?? false)
        ) {
          return scene.fix;
        }
      }
      return null;
    }
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function sceneMarker(code: string | undefined): string | null {
  const match = code?.match(/\/\/\s*scene:([a-z0-9-]+)/);
  return match?.[1] ?? null;
}

function normalize(code: string): string {
  return code.replace(/\r\n/g, "\n").trim();
}

function chunk(text: string, size: number): string[] {
  const parts: string[] = [];
  for (let index = 0; index < text.length; index += size) parts.push(text.slice(index, index + size));
  return parts;
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
