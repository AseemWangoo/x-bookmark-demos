import type { DuelEvent, ModePayload } from "../../shared/duel.ts";

export async function fetchMode(signal?: AbortSignal): Promise<ModePayload> {
  const response = await fetch("/api/mode", { signal });
  if (!response.ok) throw new Error(`Mode check failed (${response.status}).`);
  return (await response.json()) as ModePayload;
}

export async function streamDuel(
  body: { prompt: string; imageDataUrl?: string },
  onEvent: (event: DuelEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/duel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(text || `Duel failed (${response.status}).`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((item) => item.startsWith("data: "));
      if (!line) continue;
      onEvent(JSON.parse(line.slice(6)) as DuelEvent);
    }
  }
}
