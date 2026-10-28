import { handleAsk, handleCall, handleMode, handleReset } from "./http.ts";
import { startPortal } from "../portal/server.ts";
import { shutdownPool } from "./pomerado-client.ts";

if (process.env.PORTAL_EXTERNAL !== "1") startPortal();

const port = Number(process.env.API_PORT ?? 8787);
const server = Bun.serve({
  port,
  hostname: "127.0.0.1",
  routes: {
    "/api/mode": { GET: () => handleMode() },
    "/api/ask": { POST: (request) => handleAsk(request) },
    "/api/call": { POST: (request) => handleCall(request) },
    "/api/reset": { POST: () => handleReset() },
  },
  fetch() {
    return new Response("Not found", { status: 404 });
  },
});

console.log(`legacy portal api listening on ${server.port}`);

async function shutdown(): Promise<void> {
  await shutdownPool();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
