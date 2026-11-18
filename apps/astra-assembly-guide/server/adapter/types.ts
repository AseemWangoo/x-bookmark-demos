import type { ModelKey, ServiceTier } from "../../shared/copy.ts";
import type { AssembleResult } from "../../shared/result.ts";

export type AssembleJob = {
  modelKey: ModelKey;
  serviceTier: ServiceTier;
  sourceText?: string;
  imageDataUrl?: string;
  fixtureId?: string;
};

export class AssembleError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AssembleError";
    this.status = status;
  }
}

export interface AssemblyAdapter {
  readonly mode: "live" | "mock";
  run(job: AssembleJob): Promise<AssembleResult>;
}
