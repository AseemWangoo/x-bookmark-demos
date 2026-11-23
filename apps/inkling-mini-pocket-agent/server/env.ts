import { DEFAULT_MODEL, HOSTED_BLOCKED, RECORDED_LABEL } from "../shared/copy.ts";
import type { DeskMode, ModeReport } from "../shared/types.ts";

export const REASONING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export type PocketEnv = {
  mode: DeskMode;
  model: string;
  baseUrl: string | null;
  apiKey: string;
  reasoningEffort: ReasoningEffort;
  endpointHost: string | null;
  loopback: boolean;
  offline: boolean;
  mock: boolean;
  recordedLabel: string | null;
  message: string;
  streamDelayMs: number;
  pocketFolder: string | null;
};

function isEffort(value: string): value is ReasoningEffort {
  return (REASONING_EFFORTS as readonly string[]).includes(value);
}

export function isLoopbackBaseUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return LOOPBACK_HOSTS.has(host);
}

export function endpointHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
}

export function readEnv(env: Record<string, string | undefined>): PocketEnv {
  const mockForced = env.MOCK === "1";
  const baseRaw = env.LOCAL_LLM_BASE_URL?.trim() || null;
  const model = env.LOCAL_LLM_MODEL?.trim() || DEFAULT_MODEL;
  const apiKey = env.LOCAL_LLM_API_KEY?.trim() || "local";
  const effortRaw = env.LOCAL_LLM_REASONING_EFFORT?.trim() || "low";
  const reasoningEffort: ReasoningEffort = isEffort(effortRaw) ? effortRaw : "low";
  const loopback = isLoopbackBaseUrl(baseRaw);
  const host = endpointHost(baseRaw);
  let mode: DeskMode;
  if (mockForced || !baseRaw) mode = "mock";
  else if (loopback) mode = "live";
  else mode = "hosted-blocked";

  const delayRaw = Number(env.POCKET_STREAM_DELAY_MS ?? "0");
  const streamDelayMs = Number.isFinite(delayRaw) && delayRaw > 0 ? delayRaw : 0;
  const pocketFolder = env.POCKET_FOLDER?.trim() || null;

  let message = RECORDED_LABEL;
  if (mode === "live") {
    message = `Live on ${host ?? "loopback"} · model ${model} · reasoning_effort ${reasoningEffort}.`;
  } else if (mode === "hosted-blocked") {
    message = HOSTED_BLOCKED;
  } else if (mockForced && baseRaw) {
    message = `${RECORDED_LABEL} MOCK=1 is set, so ${host ?? "the configured URL"} is not called.`;
  }

  return {
    mode,
    model,
    baseUrl: baseRaw,
    apiKey,
    reasoningEffort,
    endpointHost: host,
    loopback,
    offline: mode === "live",
    mock: mode === "mock",
    recordedLabel: mode === "mock" ? RECORDED_LABEL : null,
    message,
    streamDelayMs,
    pocketFolder,
  };
}

export function modeReport(env: PocketEnv): ModeReport {
  return {
    mode: env.mode,
    model: env.model,
    endpointHost: env.endpointHost,
    loopback: env.loopback,
    offline: env.offline,
    mock: env.mock,
    recordedLabel: env.recordedLabel,
    reasoningEffort: env.reasoningEffort,
    message: env.message,
    pocketFolder: env.pocketFolder,
  };
}
