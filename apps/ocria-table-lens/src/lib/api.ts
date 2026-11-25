import type { ModePayload, TranscribeRequest, TranscribeResult } from "../../shared/types.ts";

export async function fetchMode(): Promise<ModePayload> {
  const response = await fetch("/api/mode");
  if (!response.ok) throw new Error("Could not read the desk mode.");
  return (await response.json()) as ModePayload;
}

export async function transcribe(request: TranscribeRequest): Promise<TranscribeResult> {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = (await response.json()) as TranscribeResult | { error?: string };
  if (!response.ok) {
    const error = "error" in payload ? payload.error : null;
    throw new Error(error || "Transcription failed.");
  }
  return payload as TranscribeResult;
}
