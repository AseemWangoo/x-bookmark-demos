import type { AgentEvent, FilePreview, ModeReport, PocketFile, RunRequest } from "../../shared/types.ts";

export async function getMode(): Promise<ModeReport> {
  const response = await fetch("/api/mode");
  if (!response.ok) throw new Error("Could not read /api/mode");
  return (await response.json()) as ModeReport;
}

export async function getFiles(request: RunRequest): Promise<PocketFile[]> {
  const params = new URLSearchParams({ rootId: request.rootId });
  if (request.customPath) params.set("customPath", request.customPath);
  const response = await fetch(`/api/files?${params.toString()}`);
  const body = (await response.json()) as { files?: PocketFile[]; error?: string };
  if (!response.ok) throw new Error(body.error ?? "Could not list the folder");
  return body.files ?? [];
}

export async function getFile(request: RunRequest, filePath: string): Promise<FilePreview> {
  const params = new URLSearchParams({ rootId: request.rootId, path: filePath });
  if (request.customPath) params.set("customPath", request.customPath);
  const response = await fetch(`/api/file?${params.toString()}`);
  const body = (await response.json()) as FilePreview & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Could not open the file");
  return body;
}

export async function streamRun(
  request: RunRequest,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(text || `Run failed (${response.status})`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as AgentEvent);
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as AgentEvent);
}
