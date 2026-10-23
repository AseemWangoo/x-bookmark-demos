import { handleTriageRequest } from "../server/http.ts";

export async function POST(request: Request): Promise<Response> {
  const response = await handleTriageRequest(request);
  if (response.status >= 400) console.error(`triage failed: ${response.status}`);
  return response;
}
