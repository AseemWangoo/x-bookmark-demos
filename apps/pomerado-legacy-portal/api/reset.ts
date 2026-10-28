import { handleReset } from "../server/http.ts";

export function POST(): Promise<Response> {
  return handleReset();
}