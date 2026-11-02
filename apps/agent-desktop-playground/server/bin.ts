import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
export const appRoot = path.resolve(here, "..")

type Platform = "linux" | "darwin" | "win32"

export function resolveAgentDesktopBin(
  env: Record<string, string | undefined> = process.env,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string {
  if (env.AGENT_DESKTOP_BIN) return env.AGENT_DESKTOP_BIN
  return path.join(appRoot, "node_modules", "agent-desktop", "bin", binaryName(platform, arch))
}

export function binaryName(platform: NodeJS.Platform, arch: string): string {
  if (platform === "win32") return `agent-desktop-win32-${arch}.exe`
  if (platform !== "linux" && platform !== "darwin") {
    throw new Error(`agent-desktop has no binary for platform ${platform}`)
  }
  const name: Platform = platform
  return `agent-desktop-${name}-${arch}`
}

export function buildArgv(command: readonly string[], sessionId: string | null): string[] {
  const args = [...command]
  if (sessionId) args.push("--session", sessionId)
  if (args.some((arg) => arg === "--headed" || arg.startsWith("--headed="))) {
    throw new Error("refused to build an argv that includes --headed")
  }
  return args
}

export function readPackagedVersion(): string {
  const file = path.join(appRoot, "node_modules", "agent-desktop", "package.json")
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { version?: string }
  return parsed.version ?? "unknown"
}
