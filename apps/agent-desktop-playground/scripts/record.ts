import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"

import { appRoot, readPackagedVersion } from "../server/bin.ts"
import { LiveDriver } from "../server/driver/live.ts"
import { asRecord, supportedSurfaces } from "../server/envelope.ts"
import { presetPrompts, scenarioIds } from "../server/planner/steps.ts"
import { runPrompt, type StepLog } from "../server/runner.ts"

const driver = new LiveDriver()
const status = await driver.status()
if (!status.envelope.ok || supportedSurfaces(status.envelope).length === 0) {
  console.error("record: live desktop is not available")
  console.error(JSON.stringify(status.envelope))
  process.exit(1)
}

const os = await Bun.file("/etc/os-release").text().then(prettyName).catch(() => "linux")
let failed = false
for (const scenario of scenarioIds) {
  await driver.closeApp("gnome-text-editor", null)
  await driver.closeApp("gnome-calculator", null)
  await Bun.sleep(700)
  const dir = path.join(appRoot, "fixtures", scenario)
  rmSync(dir, { recursive: true, force: true })
  const screenDir = path.join(dir, "screens")
  mkdirSync(screenDir, { recursive: true })
  const lines: string[] = []
  let snap = 0
  const result = await runPrompt({
    driver,
    prompt: presetPrompts[scenario],
    planner: "scripted",
    screenshotDir: screenDir,
    onStep: (step) => {
      console.log(`${scenario} #${step.index} ${step.ok ? "ok" : step.code} ${step.intent}`)
      if (step.envelope.ok && step.envelope.command === "snapshot") {
        const name = `snapshot-${String(snap).padStart(2, "0")}.json`
        writeFileSync(path.join(dir, name), JSON.stringify(step.envelope, null, 2))
        snap += 1
      }
      lines.push(JSON.stringify(recordedLine(step)))
      if (!step.ok) failed = true
    },
  })
  const apps = await driver.listApps()
  writeFileSync(path.join(dir, "apps.json"), JSON.stringify(apps.envelope, null, 2))
  writeFileSync(path.join(dir, "steps.jsonl"), `${lines.join("\n")}\n`)
  writeFileSync(
    path.join(dir, "meta.json"),
    JSON.stringify(
      {
        synthetic: false,
        version: readPackagedVersion(),
        recordedAt: new Date().toISOString(),
        envelopeVersion: "2.5",
        os,
        scenario,
        ok: result.ok,
      },
      null,
      2,
    ),
  )
  console.log(`${scenario} recorded ok=${result.ok} steps=${lines.length}`)
  if (!result.ok) failed = true
}

if (failed) process.exit(1)

function recordedLine(step: StepLog): { argv: string[]; envelope: StepLog["envelope"]; ms: number; screenshot?: string } {
  const screenshot = screenshotName(step)
  return {
    argv: step.argv,
    envelope: step.envelope,
    ms: Math.max(step.ms, 700),
    ...(screenshot ? { screenshot } : {}),
  }
}

function screenshotName(step: StepLog): string | undefined {
  if (!step.envelope.ok || step.envelope.command !== "screenshot") return undefined
  const data = asRecord(step.envelope.data)
  const filePath = data?.path
  if (typeof filePath !== "string") return undefined
  return `screens/${path.basename(filePath)}`
}

function prettyName(text: string): string {
  const match = /^PRETTY_NAME="(.*)"$/m.exec(text)
  return match?.[1] ?? "linux"
}
