import { handleTurn } from "../server/http.ts";

export function POST(request: Request): Promise<Response> {
  return handleTurn(request);
}
