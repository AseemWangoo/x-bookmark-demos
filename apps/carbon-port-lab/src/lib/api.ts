import type { FixtureSummary, ModePayload, PortRequest, PortResult } from "../../shared/port.ts";

export async function fetchMode(signal?: AbortSignal): Promise<ModePayload> {
  const response = await fetch("/api/mode", { signal });
  if (!response.ok) throw new Error("Mode check failed.");
  return (await response.json()) as ModePayload;
}

export async function fetchFixtures(signal?: AbortSignal): Promise<FixtureSummary[]> {
  const response = await fetch("/api/fixtures", { signal });
  if (!response.ok) throw new Error("Fixture list failed.");
  const body = (await response.json()) as { fixtures: FixtureSummary[] };
  return body.fixtures;
}

export async function requestPort(request: PortRequest): Promise<PortResult> {
  const response = await fetch("/api/port", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const body = (await response.json()) as PortResult & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Port failed.");
  return body;
}
