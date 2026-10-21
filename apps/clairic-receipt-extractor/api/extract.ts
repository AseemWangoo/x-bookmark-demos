import { handleExtractRequest } from "../server/http.ts";

export async function POST(request: Request): Promise<Response> {
  const response = await handleExtractRequest(request);
  if (response.status >= 400) console.error(`extract failed: ${response.status}`);
  return response;
}
