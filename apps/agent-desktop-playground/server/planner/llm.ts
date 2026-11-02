import type { Plan } from "./steps.ts"

export function planWithLlm(): Plan {
  return {
    ok: false,
    message:
      "LLM planner is deferred. Set PLANNER=scripted. The optional slice needs OPENAI_API_KEY and PLANNER_MODEL and is not used for captures.",
  }
}
