import type { Effort } from "../../shared/schema.ts";
import { baseUrlFor, modelFor } from "../env.ts";
import type { ProviderCall } from "./tokenhub.ts";

export function openrouterCall(env: NodeJS.ProcessEnv, effort: Effort): ProviderCall {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OpenRouter key is not configured.");
  const reasoning =
    effort === "high" ? { enabled: true, effort: "high" } : { enabled: false };
  return {
    id: "openrouter",
    apiKey,
    baseURL: baseUrlFor("openrouter", env),
    model: modelFor("openrouter", env),
    temperature: 0.2,
    topP: 1,
    extra: { reasoning },
    headers: {
      "HTTP-Referer": "http://127.0.0.1:5173",
      "X-Title": "Hy4 flash whiteboard desk",
    },
  };
}
