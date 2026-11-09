import type { EffortName, GenerationResult } from "../../shared/duel.ts";

export type GenerationRequest = {
  prompt: string;
  imageDataUrl?: string;
  effort: EffortName;
};

export type DesignAdapter = {
  readonly mode: "mock" | "live";
  generate(request: GenerationRequest): Promise<GenerationResult>;
};
