import type { ExtractRequest, ExtractResponse, Fixture } from "./types.ts";

export async function fetchMode(): Promise<"sample" | "live"> {
  const response = await fetch("/api/mode");
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { mode?: "sample" | "live" };
  return body.mode === "live" ? "live" : "sample";
}

export async function fetchFixtures(): Promise<Fixture[]> {
  const response = await fetch("/api/fixtures");
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Fixture[];
}

export async function extractDocument(request: ExtractRequest): Promise<ExtractResponse> {
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as ExtractResponse;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // The body was not JSON.
  }
  return `Request failed (${response.status})`;
}
