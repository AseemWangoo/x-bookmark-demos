import { createDeepAgent } from "deepagents";

import { resolveModel } from "./model.ts";
import { CODER_PROMPT } from "./prompts.ts";

export const graph = createDeepAgent({
  name: "coder",
  model: resolveModel(),
  systemPrompt: CODER_PROMPT,
});
