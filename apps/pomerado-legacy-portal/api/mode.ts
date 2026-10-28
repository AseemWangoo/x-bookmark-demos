import { handleMode } from "../server/http.ts";

export function GET(): Promise<Response> {
  return handleMode();
}
