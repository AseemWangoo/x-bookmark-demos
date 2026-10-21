import { listFixtures } from "./catalog.ts";
import { handleExtract, handleMode } from "./extract.ts";
import { HttpError } from "./schema.ts";

const port = Number(process.env.API_PORT ?? 8787);

const server = Bun.serve({
  port,
  routes: {
    "/api/mode": {
      GET: () => Response.json(handleMode()),
    },
    "/api/fixtures": {
      GET: () => Response.json(listFixtures()),
    },
    "/api/extract": {
      POST: async (req) => {
        try {
          const body: unknown = await req.json();
          return Response.json(await handleExtract(body));
        } catch (error) {
          const http = error instanceof HttpError ? error : new HttpError(400, "Invalid JSON");
          return Response.json({ error: http.message }, { status: http.status });
        }
      },
    },
  },
  fetch() {
    return new Response("Not found", { status: 404 });
  },
});

console.log(`clairic api listening on ${server.port}`);
