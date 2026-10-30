import { handleRequest } from "./http"

const port = Number(Bun.env.PORT || 8787)

Bun.serve({
  port,
  fetch: (request) => handleRequest(request),
})

console.log(`Terra API listening on http://localhost:${port}`)
