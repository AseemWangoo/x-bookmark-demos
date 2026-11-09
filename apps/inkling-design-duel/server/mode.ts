import { createMockAdapter } from "./adapter/mock.ts";
import { createTinkerAdapter } from "./adapter/tinker.ts";
import type { DesignAdapter } from "./adapter/types.ts";
import { LIVE_BANNER, LIVE_SETUP, MOCK_BANNER, type ModePayload } from "../shared/duel.ts";

export function selectAdapter(env: NodeJS.ProcessEnv = process.env): DesignAdapter {
  if (env.TINKER_API_KEY?.trim()) return createTinkerAdapter(env);
  return createMockAdapter();
}

export function modePayload(adapter: DesignAdapter): ModePayload {
  if (adapter.mode === "mock") {
    return {
      mode: "mock",
      banner: MOCK_BANNER,
      detail:
        "Both panes are recorded HTML fixtures with canned latency, token, and cost numbers. They are not Inkling output and no Tinker call is made.",
      commands: LIVE_SETUP,
    };
  }
  return {
    mode: "live",
    banner: LIVE_BANNER,
    detail:
      "Low effort is 0.2 and high effort is 0.9. The server tries the OpenAI-compatible /chat/completions endpoint first (separate_reasoning on). If that fails, it falls back to the Anthropic-compatible /v1/messages endpoint. The API key stays on the server. Vision on the OpenAI-compatible endpoint is undocumented; a rejected sketch retries on the Anthropic adapter.",
    commands: LIVE_SETUP,
  };
}
