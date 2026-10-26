import { handleExamples } from "../server/http.ts";

export function GET(): Response {
  try {
    return handleExamples();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "examples failed");
    return Response.json({ error: "examples failed" }, { status: 500 });
  }
}
