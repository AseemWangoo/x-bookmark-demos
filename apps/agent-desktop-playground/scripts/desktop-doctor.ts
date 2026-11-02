import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"

import { readPackagedVersion, resolveAgentDesktopBin } from "../server/bin.ts"
import { LiveDriver } from "../server/driver/live.ts"

const packages = [
  "at-spi2-core",
  "dbus-x11",
  "xvfb",
  "x11-utils",
  "openbox",
  "gnome-text-editor",
  "gnome-calculator",
  "ffmpeg",
]

const bin = resolveAgentDesktopBin()
console.log(`os ${readOs()}`)
console.log(`kernel ${exec("uname", ["-sr"])}`)
console.log(`display ${process.env.DISPLAY ?? "(unset)"}`)
console.log(`dbus ${process.env.DBUS_SESSION_BUS_ADDRESS ?? "(unset)"}`)
console.log(`runtime ${process.env.XDG_RUNTIME_DIR ?? "(unset)"}`)
console.log(`binary ${bin}`)
console.log(`binary_exists ${existsSync(bin)}`)
console.log(`package_version ${safeVersion()}`)
for (const name of packages) {
  console.log(`apt ${name} ${installed(name) ? "installed" : "missing"}`)
}

const driver = new LiveDriver(bin)
try {
  const version = await driver.status()
  console.log(`status ${JSON.stringify(version.envelope)}`)
  if (version.stderr) console.log(`status_stderr ${version.stderr.trim()}`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.log(`status_error ${message}`)
}

function safeVersion(): string {
  try {
    return readPackagedVersion()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

function installed(name: string): boolean {
  try {
    execFileSync("dpkg", ["-s", name], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

function readOs(): string {
  return exec("sh", ["-c", ". /etc/os-release && printf %s \"$PRETTY_NAME\""])
}

function exec(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: "utf8" }).trim()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}
