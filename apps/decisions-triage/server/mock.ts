import { illustrativeDecision, illustrativePackedDecision } from "../fixtures/mock-decisions.ts";
import { illustrativeResponse } from "../fixtures/mock-responses.ts";
import type { InboxMessage } from "../src/lib/types.ts";
import type { DecisionPayload } from "./schema.ts";
import { mockSleepScale } from "./env.ts";
import { sleep } from "./pool.ts";
import type { ResponsesPayload } from "./responses.ts";

export async function replayDecision(message: InboxMessage): Promise<{ raw: DecisionPayload; latencyMs: number }> {
  const fixture = illustrativeDecision(message.id);
  await sleep(Math.round(fixture.latencyMs * mockSleepScale()));
  return { raw: fixture.response, latencyMs: fixture.latencyMs };
}

export async function replayPacked(messages: InboxMessage[]): Promise<{ raw: DecisionPayload; latencyMs: number }> {
  const fixture = illustrativePackedDecision(messages.map((message) => message.id));
  await sleep(Math.round(fixture.latencyMs * mockSleepScale()));
  return { raw: fixture.response, latencyMs: fixture.latencyMs };
}

export async function replayResponse(message: InboxMessage): Promise<{ raw: ResponsesPayload; latencyMs: number; usage: ResponsesPayload["usage"] }> {
  const fixture = illustrativeResponse(message.id);
  await sleep(Math.round(fixture.latencyMs * mockSleepScale()));
  return {
    raw: { output_text: fixture.output_text, usage: fixture.usage },
    latencyMs: fixture.latencyMs,
    usage: fixture.usage,
  };
}
