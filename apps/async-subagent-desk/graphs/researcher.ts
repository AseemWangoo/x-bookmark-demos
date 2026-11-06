import { createDeepAgent } from "deepagents";

import { resolveModel } from "./model.ts";
import { RESEARCHER_PROMPT } from "./prompts.ts";

export const graph = createDeepAgent({
  name: "researcher",
  model: resolveModel(),
  systemPrompt: RESEARCHER_PROMPT,
});
