import { handleAsk } from "../server/http.ts";

export function POST(request: Request): Promise<Response> {
  return handleAsk(request);
}
