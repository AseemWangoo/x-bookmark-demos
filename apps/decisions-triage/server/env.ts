import type { RunMode } from "../src/lib/types.ts";

const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export type ServerEnv = {
  mode: RunMode;
  apiKey: string | null;
  baseURL?: string;
  model: string;
  reasoningEffort: ReasoningEffort;
};

export function readEnv(): ServerEnv {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || null;
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  const model = process.env.DECISIONS_MODEL?.trim() || "gpt-6-luna";
  return {
    mode: apiKey ? "live" : "mock",
    apiKey,
    baseURL,
    model,
    reasoningEffort: readReasoningEffort(),
  };
}

export function readReasoningEffort(): ReasoningEffort {
  const raw = process.env.COMPARE_REASONING_EFFORT?.trim() ?? "";
  if ((REASONING_EFFORTS as readonly string[]).includes(raw)) return raw as ReasoningEffort;
  return "none";
}

export function publicMode(): { mode: RunMode } {
  return { mode: readEnv().mode };
}

export function redact(message: string, secret: string | null): string {
  if (!secret) return message;
  return message.split(secret).join("[redacted]");
}

export function mockSleepScale(): number {
  const raw = process.env.MOCK_SLEEP_SCALE;
  if (raw === undefined || raw === "") return 0.15;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0.15;
  return parsed;
}
