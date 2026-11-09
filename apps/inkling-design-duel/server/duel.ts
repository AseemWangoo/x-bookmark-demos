import { EFFORT_ORDER, LIVE_BANNER, MOCK_BANNER, type DuelEvent } from "../shared/duel.ts";
import type { DesignAdapter } from "./adapter/types.ts";

export type DuelInput = {
  prompt: string;
  imageDataUrl?: string;
};

export async function runDuel(
  adapter: DesignAdapter,
  input: DuelInput,
  emit: (event: DuelEvent) => void,
): Promise<void> {
  emit({
    type: "meta",
    mode: adapter.mode,
    banner: adapter.mode === "mock" ? MOCK_BANNER : LIVE_BANNER,
  });
  for (const effort of EFFORT_ORDER) {
    emit({ type: "status", effort, state: "pending" });
  }
  await Promise.all(
    EFFORT_ORDER.map(async (effort) => {
      try {
        const result = await adapter.generate({
          prompt: input.prompt,
          imageDataUrl: input.imageDataUrl,
          effort,
        });
        emit({ type: "result", effort, result });
      } catch (error) {
        emit({
          type: "error",
          effort,
          message: error instanceof Error ? error.message : "Generation failed.",
        });
      }
    }),
  );
  emit({ type: "done" });
}
