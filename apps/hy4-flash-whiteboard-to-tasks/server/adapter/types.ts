import type { ExtractRequest, ExtractResult } from "../../shared/types.ts";

export class ExtractError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ExtractError";
    this.status = status;
  }
}

export interface ExtractAdapter {
  readonly mode: "live" | "mock";
  run(request: ExtractRequest): Promise<ExtractResult>;
}
