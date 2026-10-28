import type { AskResponse, CallResult, ModeReport, VendorInput } from "./types";

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function fetchMode(): Promise<ModeReport> {
  const response = await fetch("/api/mode");
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as ModeReport;
}

export async function ask(text: string): Promise<AskResponse> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as AskResponse;
}

export async function runAddVendor(input: VendorInput): Promise<{ result: CallResult; secondsPerStep: number }> {
  const response = await fetch("/api/call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ integration: "add_vendor", input }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { result: CallResult; secondsPerStep: number };
}

export async function resetPortal(): Promise<void> {
  const response = await fetch("/api/reset", { method: "POST" });
  if (!response.ok) throw new Error(await readError(response));
}
