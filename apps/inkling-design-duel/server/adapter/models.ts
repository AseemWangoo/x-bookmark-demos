import { MODEL_BASE, MODEL_SERVERLESS } from "../../shared/duel.ts";

export type ModelEnv = {
  TINKER_MODEL?: string;
};

/**
 * Operator override first when set, then the two documented Inkling 2 Small ids:
 * base `thinkingmachines/Inkling-2-Small`, then the serverless sampling id.
 */
export function modelCandidates(env: ModelEnv): string[] {
  const override = env.TINKER_MODEL?.trim();
  const ordered = override ? [override, MODEL_BASE, MODEL_SERVERLESS] : [MODEL_BASE, MODEL_SERVERLESS];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ordered) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  return unique;
}
