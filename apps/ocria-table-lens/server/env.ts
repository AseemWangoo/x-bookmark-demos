import { DEFAULT_MODEL, DEFAULT_OLLAMA_HOST } from "../shared/copy.ts";

const MODEL_PATTERN = /^[A-Za-z0-9_.:/-]{1,128}$/;

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function ollamaModel(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.OLLAMA_MODEL?.trim() ?? "";
  if (MODEL_PATTERN.test(raw)) return raw;
  return DEFAULT_MODEL;
}

export function mockForced(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MOCK === "1";
}

export function loopbackOrigin(raw: string | undefined): URL | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") return null;
  return new URL(url.origin);
}

export function configuredOrigin(env: NodeJS.ProcessEnv = process.env): URL | null {
  return loopbackOrigin(env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST);
}

export type ModeReason = "mock-flag" | "non-loopback" | "unreachable" | "reachable";

export async function detectMode(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<{ mode: "live" | "mock"; reason: ModeReason; origin: URL | null }> {
  if (mockForced(env)) return { mode: "mock", reason: "mock-flag", origin: configuredOrigin(env) };
  const origin = configuredOrigin(env);
  if (!origin) return { mode: "mock", reason: "non-loopback", origin: null };
  try {
    const response = await fetchImpl(new URL("/api/version", origin), {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(800),
    });
    if (!response.ok) return { mode: "mock", reason: "unreachable", origin };
    return { mode: "live", reason: "reachable", origin };
  } catch {
    return { mode: "mock", reason: "unreachable", origin };
  }
}
