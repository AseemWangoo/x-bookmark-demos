import { handleCall } from "../server/http.ts";

export function POST(request: Request): Promise<Response> {
  return handleCall(request);
}
