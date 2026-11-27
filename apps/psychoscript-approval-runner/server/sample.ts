import { join } from "node:path"

export function samplePath(): string {
  return join(import.meta.dir, "../shared/fixtures/sample.js")
}

export function readSample(): Promise<string> {
  return Bun.file(samplePath()).text()
}
