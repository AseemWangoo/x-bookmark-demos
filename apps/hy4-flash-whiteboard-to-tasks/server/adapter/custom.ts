import type { Effort } from "../../shared/schema.ts";
import { baseUrlFor, modelFor, tokenhubKey } from "../env.ts";
import type { ProviderCall } from "./tokenhub.ts";

export function customCall(env: NodeJS.ProcessEnv, effort: Effort): ProviderCall {
  const reasoningEffort = effort === "high" ? "high" : "no_think";
  return {
    id: "custom",
    apiKey: tokenhubKey(env) || env.OPENROUTER_API_KEY?.trim() || "EMPTY",
    baseURL: baseUrlFor("custom", env),
    model: modelFor("custom", env),
    temperature: 0.9,
    topP: 1,
    extra: {
      reasoning_effort: reasoningEffort,
      thinking: { type: effort === "high" ? "enabled" : "disabled" },
      chat_template_kwargs: { reasoning_effort: reasoningEffort },
    },
  };
}
