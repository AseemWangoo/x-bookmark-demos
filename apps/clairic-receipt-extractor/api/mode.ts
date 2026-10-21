import { handleMode } from "../server/extract.ts";

export function GET(): Response {
  try {
    return Response.json(handleMode());
  } catch (error) {
    console.error(error instanceof Error ? error.message : "mode failed");
    return Response.json({ error: "mode failed" }, { status: 500 });
  }
}
