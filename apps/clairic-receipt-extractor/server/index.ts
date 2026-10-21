import { listFixtures } from "./catalog.ts";
import { handleMode } from "./extract.ts";
import { handleExtractRequest } from "./http.ts";

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
      POST: (req) => handleExtractRequest(req),
    },
  },
  fetch() {
    return new Response("Not found", { status: 404 });
  },
});

console.log(`clairic api listening on ${server.port}`);
