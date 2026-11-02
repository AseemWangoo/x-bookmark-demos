import { createRuntime, handle } from "./http.ts"

const runtime = await createRuntime()
const server = Bun.serve({
  port: runtime.settings.port,
  hostname: "127.0.0.1",
  fetch(request) {
    return handle(request, runtime)
  },
})

console.log(
  `agent-desktop playground api on http://${server.hostname}:${server.port} (${runtime.decision.mode}${runtime.decision.reason ? `: ${runtime.decision.reason}` : ""})`,
)
