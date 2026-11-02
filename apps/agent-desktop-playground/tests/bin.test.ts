import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"

import { binaryName, buildArgv, resolveAgentDesktopBin } from "../server/bin.ts"

describe("bin", () => {
  test("resolves the platform binary and builds a session argv without --headed", () => {
    expect(binaryName("linux", "x64")).toBe("agent-desktop-linux-x64")
    expect(binaryName("darwin", "arm64")).toBe("agent-desktop-darwin-arm64")
    expect(binaryName("win32", "x64")).toBe("agent-desktop-win32-x64.exe")
    const bin = resolveAgentDesktopBin()
    expect(bin.endsWith(`${binaryName(process.platform, process.arch)}`)).toBe(true)
    expect(existsSync(bin)).toBe(true)
    const argv = buildArgv(["type", "@s8f3k2p9:e8", "To-do"], "run-1")
    expect(argv).toEqual(["type", "@s8f3k2p9:e8", "To-do", "--session", "run-1"])
    expect(argv.includes("--headed")).toBe(false)
    expect(argv.join(" ")).not.toContain("--headed")
    expect(() => buildArgv(["click", "@s8f3k2p9:e8", "--headed"], "run-1")).toThrow(/--headed/)
  })
})
