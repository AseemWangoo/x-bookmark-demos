import { createDeepAgent, type AsyncSubAgent } from "deepagents";

import { resolveModel } from "./model.ts";
import { SUPERVISOR_PROMPT } from "./prompts.ts";

const researcher: AsyncSubAgent = {
  name: "researcher",
  description:
    "Researches a question in the background. Use for competitive briefs, comparisons, and synthesis.",
  graphId: "researcher",
  updateStrategy: "interrupt",
};

const coder: AsyncSubAgent = {
  name: "coder",
  description:
    "Writes and reviews code in the background. Use for small implementations, refactors, and debugging.",
  graphId: "coder",
  updateStrategy: "interrupt",
};

/**
 * Co-deployed supervisor. graphId on each subagent is what makes it async.
 * No checkpointer here: `langgraphjs dev` persists runs on the Agent Server.
 */
export const graph = createDeepAgent({
  name: "agent",
  model: resolveModel(),
  systemPrompt: SUPERVISOR_PROMPT,
  subagents: [researcher, coder],
});
