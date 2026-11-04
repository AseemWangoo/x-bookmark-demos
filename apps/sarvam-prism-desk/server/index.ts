import { handleRequest } from "./http";

const port = Number(Bun.env.PORT || 8787);

Bun.serve({
  port,
  hostname: "127.0.0.1",
  fetch: (request) => handleRequest(request),
});

console.log(`Sarvam Prism Desk API on http://127.0.0.1:${port}`);
