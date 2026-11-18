import type { ModelKey, ServiceTier } from "../../shared/copy.ts";
import type { AssembleResponse, ModePayload } from "../../shared/result.ts";

export async function fetchMode(): Promise<ModePayload> {
  const response = await fetch("/api/mode");
  if (!response.ok) throw new Error("Could not read the server mode.");
  return response.json() as Promise<ModePayload>;
}

export async function assemble(body: {
  sourceText?: string;
  imageDataUrl?: string;
  fixtureId?: string;
  models: ModelKey[];
  serviceTier: ServiceTier;
}): Promise<AssembleResponse> {
  const response = await fetch("/api/assemble", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as AssembleResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Assemble failed.");
  }
  return data;
}
