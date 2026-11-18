import {
  DEFAULT_MODEL_IDS,
  type ModelKey,
} from "../shared/copy.ts";

export function resolveMode(env: NodeJS.ProcessEnv): "live" | "mock" {
  if (env.MOCK === "1") return "mock";
  if (env.OPENAI_API_KEY?.trim()) return "live";
  return "mock";
}

export function modelIdFor(key: ModelKey, env: NodeJS.ProcessEnv): string {
  switch (key) {
    case "astra":
      return env.OPENAI_MODEL_ASTRA?.trim() || DEFAULT_MODEL_IDS.astra;
    case "sol":
      return env.OPENAI_MODEL_SOL?.trim() || DEFAULT_MODEL_IDS.sol;
    default: {
      const unknown: never = key;
      throw new Error(`Unknown model ${String(unknown)}`);
    }
  }
}
