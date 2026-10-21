import { handleExtract } from "./extract.ts";
import { HttpError } from "./schema.ts";

export async function handleExtractRequest(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    return Response.json(await handleExtract(body));
  } catch (error) {
    const http = error instanceof HttpError ? error : new HttpError(400, "Invalid JSON");
    console.error(http.message);
    return Response.json({ error: http.message }, { status: http.status });
  }
}
