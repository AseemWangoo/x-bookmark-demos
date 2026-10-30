export const DEFAULT_MODEL = "gpt-6.1-terra"

export interface TerraEnv {
  mode: "mock" | "live"
  model: string
  apiKey?: string
  defaultEffort: "none" | "low" | "medium" | "high"
  mockSpeed: number
}

export function readEnv(env: Record<string, string | undefined> = Bun.env): TerraEnv {
  const apiKey = env.OPENAI_API_KEY
  const forcedMock = env.MOCK === "1"
  const effort = env.TERRA_EFFORT

  return {
    mode: apiKey && !forcedMock ? "live" : "mock",
    model: env.TERRA_MODEL || DEFAULT_MODEL,
    apiKey,
    defaultEffort:
      effort === "none" || effort === "low" || effort === "high" ? effort : "medium",
    mockSpeed: Math.max(Number(env.MOCK_SPEED) || 1, 0.1),
  }
}
