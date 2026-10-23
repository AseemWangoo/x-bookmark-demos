import { handleFixtures, handleMode, handleTriageRequest } from "./http.ts";

const port = Number(process.env.API_PORT ?? 8787);

const server = Bun.serve({
  port,
  hostname: "127.0.0.1",
  routes: {
    "/api/mode": {
      GET: () => handleMode(),
    },
    "/api/fixtures": {
      GET: () => handleFixtures(),
    },
    "/api/triage": {
      POST: (request) => handleTriageRequest(request),
    },
  },
  fetch() {
    return new Response("Not found", { status: 404 });
  },
});

console.log(`decisions triage api listening on ${server.port}`);
