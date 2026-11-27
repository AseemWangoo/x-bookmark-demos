import { join } from "node:path"

export type Env = {
  dataDir: string
  port: number
  timeoutMs: number
  demo: boolean
}

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const timeout = Number(source.TIMEOUT_MS ?? 5_000)
  const port = Number(source.PORT ?? 8787)
  return {
    dataDir: source.DATA_DIR ?? join(import.meta.dir, "../data/runs"),
    port: Number.isFinite(port) ? port : 8787,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 5_000,
    demo: source.DEMO === "1",
  }
}
