import { handleFixtures } from "../server/http.ts";

export function GET(): Response {
  try {
    return handleFixtures();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "fixtures failed");
    return Response.json({ error: "fixtures failed" }, { status: 500 });
  }
}
