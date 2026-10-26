import type { ErrorPhase } from "../lib/types.ts";

export type ParentToFrame =
  | { type: "run"; runId: string; code: string }
  | { type: "resetCamera" };

export type FrameToParent =
  | { type: "ready"; runId: string }
  | { type: "heartbeat"; runId: string }
  | {
      type: "error";
      runId: string;
      phase: ErrorPhase;
      message: string;
      stack?: string;
      line?: number;
    };

export function isFrameMessage(value: unknown): value is FrameToParent {
  if (!value || typeof value !== "object") return false;
  const message = value as { type?: unknown; runId?: unknown };
  if (typeof message.runId !== "string") return false;
  return message.type === "ready" || message.type === "heartbeat" || message.type === "error";
}
