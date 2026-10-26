import type { ExampleScene, RunMode, TurnEvent, TurnRequest } from "./types.ts";

export async function getMode(): Promise<{ mode: RunMode }> {
  const response = await fetch("/api/mode");
  if (!response.ok) throw new Error("Could not read mode");
  return response.json() as Promise<{ mode: RunMode }>;
}

export async function getExamples(): Promise<ExampleScene[]> {
  const response = await fetch("/api/examples");
  if (!response.ok) throw new Error("Could not read examples");
  return response.json() as Promise<ExampleScene[]>;
}

export async function streamTurn(
  body: TurnRequest,
  onEvent: (event: TurnEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/turn", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed (${response.status})`;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      /* body was not JSON */
    }
    throw new Error(message);
  }
  if (!response.body) throw new Error("Empty response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as TurnEvent);
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as TurnEvent);
}
