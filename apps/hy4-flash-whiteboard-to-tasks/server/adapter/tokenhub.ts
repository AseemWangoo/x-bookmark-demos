import type { Effort } from "../../shared/schema.ts";
import type { ProviderId } from "../../shared/types.ts";
import { baseUrlFor, modelFor, tokenhubKey } from "../env.ts";

export type ProviderCall = {
  id: ProviderId;
  apiKey: string;
  baseURL: string;
  model: string;
  temperature: number;
  topP: number;
  extra: Record<string, unknown>;
  headers?: Record<string, string>;
};

export function tokenhubCall(env: NodeJS.ProcessEnv, effort: Effort): ProviderCall {
  const apiKey = tokenhubKey(env);
  if (!apiKey) throw new Error("TokenHub key is not configured.");
  const reasoningEffort = effort === "high" ? "high" : "no_think";
  return {
    id: "tokenhub",
    apiKey,
    baseURL: baseUrlFor("tokenhub", env),
    model: modelFor("tokenhub", env),
    temperature: 0.2,
    topP: 1,
    extra: {
      reasoning_effort: reasoningEffort,
      thinking: { type: effort === "high" ? "enabled" : "disabled" },
    },
  };
}
