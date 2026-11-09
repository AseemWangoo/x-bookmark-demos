import { createApp } from "./http.ts";
import { selectAdapter } from "./mode.ts";

const adapter = selectAdapter(process.env);
const app = createApp(adapter);
const port = Number(process.env.PORT ?? 8787);

Bun.serve({
  hostname: "127.0.0.1",
  port,
  fetch: (request) => app.handle(request),
});

console.log(`inkling duel api ${adapter.mode} http://127.0.0.1:${port}`);
