import { listFixtures } from "../server/catalog.ts";

export function GET(): Response {
  try {
    return Response.json(listFixtures());
  } catch (error) {
    console.error(error instanceof Error ? error.message : "fixtures failed");
    return Response.json({ error: "fixtures failed" }, { status: 500 });
  }
}
