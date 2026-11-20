import type { ExtractRequest, ExtractResult, ModePayload } from "../../shared/types.ts";

export async function fetchMode(): Promise<ModePayload> {
  const response = await fetch("/api/mode");
  if (!response.ok) throw new Error("Mode check failed.");
  return (await response.json()) as ModePayload;
}

export async function extractBoard(body: ExtractRequest): Promise<ExtractResult> {
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as ExtractResult | { error?: string };
  if (!response.ok || !("board" in payload)) {
    const message = "error" in payload && payload.error ? payload.error : "Extract failed.";
    throw new Error(message);
  }
  return payload;
}
