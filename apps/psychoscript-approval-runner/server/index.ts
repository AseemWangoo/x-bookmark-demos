import { createApp } from "./http.ts"
import { readEnv } from "./env.ts"

const env = readEnv()
const app = createApp(env)

Bun.serve({
  hostname: "127.0.0.1",
  port: env.port,
  fetch: (request) => app.handle(request),
})

console.log(`psychoscript approval runner http://127.0.0.1:${env.port}`)
