import { handleExamples, handleMode, handleTurn } from "./http.ts";

const port = Number(process.env.API_PORT ?? 8787);

const server = Bun.serve({
  port,
  hostname: "127.0.0.1",
  routes: {
    "/api/mode": {
      GET: () => handleMode(),
    },
    "/api/examples": {
      GET: () => handleExamples(),
    },
    "/api/turn": {
      POST: (request) => handleTurn(request),
    },
  },
  fetch() {
    return new Response("Not found", { status: 404 });
  },
});

console.log(`kimi scene api listening on ${server.port}`);
