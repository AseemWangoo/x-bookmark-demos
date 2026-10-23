import type { InboxMessage, RunMode, TriageRequest, TriageResponse } from "./types.ts";

export async function getMode(): Promise<{ mode: RunMode }> {
  const response = await fetch("/api/mode");
  if (!response.ok) throw new Error("Could not read the server mode");
  return (await response.json()) as { mode: RunMode };
}

export async function getFixtures(): Promise<InboxMessage[]> {
  const response = await fetch("/api/fixtures");
  if (!response.ok) throw new Error("Could not load the inbox");
  return (await response.json()) as InboxMessage[];
}

export async function postTriage(body: TriageRequest): Promise<TriageResponse> {
  const response = await fetch("/api/triage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as TriageResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Triage failed");
  return payload;
}
