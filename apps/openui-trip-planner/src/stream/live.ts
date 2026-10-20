export async function streamLive(
  message: string,
  onChunk: (full: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(detail || `Live model request failed (${response.status}).`);
  }

  if (!response.body) {
    throw new Error("Live model returned an empty response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }

  full += decoder.decode();
  if (!full.trim()) {
    throw new Error("The model returned an empty plan.");
  }
  onChunk(full);
}
