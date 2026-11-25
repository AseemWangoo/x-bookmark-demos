import type { TranscribeRequest, TranscribeResult } from "../../shared/types.ts";

export class TranscribeError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TranscribeError";
    this.status = status;
  }
}

export type TranscribeAdapter = {
  mode: "live" | "mock";
  transcribe(request: TranscribeRequest): Promise<TranscribeResult>;
};
