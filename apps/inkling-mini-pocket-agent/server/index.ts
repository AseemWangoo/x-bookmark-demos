import { createApp } from "./http.ts";
import { readEnv } from "./env.ts";

const env = readEnv(process.env);
const app = createApp(env);
const port = Number(process.env.PORT ?? 8787);

Bun.serve({
  hostname: "127.0.0.1",
  port,
  fetch: (request) => app.handle(request),
});

console.log(
  `inkling mini pocket agent ${env.mode} offline=${env.offline} http://127.0.0.1:${port}`,
);
