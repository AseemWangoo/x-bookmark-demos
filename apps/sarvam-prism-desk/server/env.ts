export type AppEnv = Record<string, string | undefined>;

export type ResolvedEnv = {
  mode: "mock" | "live";
  model: string;
  baseUrl: string;
  apiKey?: string;
  mockSpeed: number;
  autoThreshold: number;
};

export function resolveEnv(env: AppEnv): ResolvedEnv {
  const apiKey = env.SARVAM_API_KEY?.trim() || undefined;
  const forceMock = env.MOCK === "1";
  const model = env.PRISM_MODEL?.trim() || "sarvam-prism";
  const baseUrl = (env.SARVAM_BASE_URL?.trim() || "https://api.sarvam.ai").replace(/\/$/, "");
  const mockSpeed = Number(env.MOCK_SPEED || "1") || 1;
  const parsedThreshold = Number(env.AUTO_THRESHOLD ?? "0.9");
  const autoThreshold = Number.isFinite(parsedThreshold) ? parsedThreshold : 0.9;
  return {
    mode: apiKey && !forceMock ? "live" : "mock",
    model,
    baseUrl,
    apiKey,
    mockSpeed,
    autoThreshold,
  };
}
