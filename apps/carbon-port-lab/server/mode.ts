import { createGatewayAdapter, resolveGatewayModel } from "./adapter/gateway.ts";
import { createMockAdapter } from "./adapter/mock.ts";
import type { PortAdapter } from "./adapter/types.ts";
import { LIVE_BANNER, LIVE_SETUP, MOCK_BANNER, type ModePayload } from "../shared/port.ts";

export function selectAdapter(env: Record<string, string | undefined> = process.env): PortAdapter {
  const model = resolveGatewayModel(env);
  if (env.AI_GATEWAY_API_KEY?.trim()) return createGatewayAdapter(env);
  return createMockAdapter({ model });
}

export function modePayload(adapter: PortAdapter): ModePayload {
  if (adapter.mode === "mock") {
    return {
      mode: "mock",
      banner: MOCK_BANNER,
      model: adapter.model,
      setup: LIVE_SETUP,
      detail:
        "Latency, tokens, cost, and HTML are recorded fixtures. They are not Gemini 4 Carbon output, and no AI Gateway call is made.",
    };
  }
  return {
    mode: "live",
    banner: LIVE_BANNER,
    model: adapter.model,
    setup: LIVE_SETUP,
    detail:
      "Calls use generateText with instructions and providerOptions.google.thinkingConfig.thinkingLevel. If that option is rejected or ignored, the adapter retries the same shape under providerOptions.vertex and then stops. It does not send the top-level reasoning option or thinkingBudget.",
  };
}
