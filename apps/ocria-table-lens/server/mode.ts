import {
  LICENSE_NOTE,
  LIVE_BANNER,
  MOCK_BANNER,
  RAM_NOTE,
} from "../shared/copy.ts";
import type { DeskSource, ModePayload } from "../shared/types.ts";
import { createMockAdapter } from "./adapter/mock.ts";
import { createOllamaAdapter } from "./adapter/ollama.ts";
import type { TranscribeAdapter } from "./adapter/types.ts";
import { configuredOrigin, detectMode, mockForced, ollamaModel, type FetchLike, type ModeReason } from "./env.ts";

const SETUP = [
  "Install Ollama 0.40.18 or later.",
  "ollama pull llamaindex/ocria-1",
  "ollama run llamaindex/ocria-1 --think=false",
  "OLLAMA_HOST defaults to http://127.0.0.1:11434 and must stay on loopback.",
  "OLLAMA_MODEL defaults to llamaindex/ocria-1.",
  "MOCK=1 forces recorded demo mode even when Ollama is running.",
  "cd apps/ocria-table-lens && bun install && bun run dev",
];

export async function selectAdapter(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<TranscribeAdapter> {
  const detected = await detectMode(env, fetchImpl);
  if (detected.mode === "live") return createOllamaAdapter(env, fetchImpl);
  return createMockAdapter();
}

export function modePayload(env: NodeJS.ProcessEnv, mode: DeskSource): ModePayload {
  const model = ollamaModel(env);
  const origin = configuredOrigin(env);
  const forced = mockForced(env);
  const reason = reasonFor(mode, forced, origin);
  switch (mode) {
    case "mock":
      return {
        mode,
        banner: MOCK_BANNER,
        detail: mockDetail(reason),
        model,
        host: null,
        loopback: origin !== null,
        mockForced: forced,
        commands: SETUP,
        ramNote: RAM_NOTE,
        license: LICENSE_NOTE,
        setup: SETUP,
      };
    case "live":
      return {
        mode,
        banner: LIVE_BANNER,
        detail: `Native POST /api/chat on ${origin?.origin ?? "loopback"}. Model ${model}. think is false, the user content is empty, the page is an images base64 entry, temperature is 0, num_ctx is 32768, num_predict is 24576, keep_alive is 5m. No custom system prompt is sent.`,
        model,
        host: origin?.origin ?? null,
        loopback: true,
        mockForced: false,
        commands: SETUP,
        ramNote: RAM_NOTE,
        license: LICENSE_NOTE,
        setup: SETUP,
      };
    default: {
      const neverMode: never = mode;
      return neverMode;
    }
  }
}

function reasonFor(mode: DeskSource, forced: boolean, origin: URL | null): ModeReason {
  if (mode === "live") return "reachable";
  if (forced) return "mock-flag";
  if (!origin) return "non-loopback";
  return "unreachable";
}

function mockDetail(reason: ModeReason): string {
  const base =
    "Hand-authored sample page and Markdown. Nothing here was transcribed by OCRia-1, and the page is not a LlamaIndex asset. A page that is not the sample is refused.";
  switch (reason) {
    case "mock-flag":
      return `${base} MOCK=1 is set, so the desk stays on the recording even if Ollama is running.`;
    case "non-loopback":
      return `${base} OLLAMA_HOST is not a loopback origin, so no image was sent.`;
    case "unreachable":
      return `${base} Ollama was not reachable on loopback, so the desk stayed on the recording.`;
    case "reachable":
      return base;
    default: {
      const neverReason: never = reason;
      return neverReason;
    }
  }
}
