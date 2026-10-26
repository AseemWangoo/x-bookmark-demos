import type { Effort, RunMode } from "../src/lib/types.ts";
import { DEFAULT_BASE_URL } from "./kimi.ts";

const EFFORTS = ["low", "high", "max"] as const;

export type ServerEnv = {
  mode: RunMode;
  apiKey: string | null;
  baseURL: string;
  maxCompletionTokens: number;
  defaultEffort: Effort;
};

export function readEnv(): ServerEnv {
  const apiKey = process.env.MOONSHOT_API_KEY?.trim() || null;
  const baseURL = process.env.MOONSHOT_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return {
    mode: apiKey ? "live" : "mock",
    apiKey,
    baseURL,
    maxCompletionTokens: readPositiveInt(process.env.KIMI_MAX_COMPLETION_TOKENS, 32768),
    defaultEffort: readEffort(process.env.KIMI_DEFAULT_EFFORT),
  };
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
  if (raw === undefined || raw === "") return 0.35;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0.35;
  return parsed;
}

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function readEffort(raw: string | undefined): Effort {
  const value = raw?.trim() ?? "";
  if ((EFFORTS as readonly string[]).includes(value)) return value as Effort;
  return "high";
}
