import { describe, expect, test } from "bun:test"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

import { appRoot } from "../server/bin.ts"
import { parseEnvelope } from "../server/envelope.ts"
import { findRef, treeFromEnvelope } from "../server/planner/refs.ts"

describe("refs", () => {
  test("qualifies a bare @eN and refuses to guess", () => {
    const found = findRef(
      { role: "textfield", ref_id: "@e8", available_actions: ["TypeText"] },
      "s8f3k2p9",
      { role: "textfield", action: "TypeText" },
    )
    expect(found.ok).toBe(true)
    if (found.ok) expect(found.ref).toBe("@s8f3k2p9:e8")

    const missing = findRef({ role: "window", children: [] }, "s1", { role: "button", name: "nope" })
    expect(missing).toEqual({
      ok: false,
      code: "not_found",
      message: 'No button named "nope" in snapshot s1',
    })
  })

  test("finds the text editor document and calculator buttons in recorded snapshots", () => {
    const editor = loadSnapshot("todo", 0)
    const document = findRef(editor.tree, editor.snapshotId, { role: "textfield", action: "TypeText" })
    expect(document.ok).toBe(true)
    if (document.ok) {
      expect(document.ref).toBe(`@${editor.snapshotId}:${document.ref.split(":")[1]}`)
      expect(document.ref.startsWith("@e")).toBe(false)
    }

    const calculator = loadSnapshot("calculator", 0)
    for (const name of ["1", "2", "×", "7", "="]) {
      const button = findRef(calculator.tree, calculator.snapshotId, { role: "button", name })
      expect(button.ok, name).toBe(true)
      if (button.ok) expect(button.ref).toMatch(/^@[A-Za-z0-9]+:e\d+$/)
    }
  })
})

function loadSnapshot(scenario: string, index: number): { tree: NonNullable<ReturnType<typeof treeFromEnvelope>>["tree"]; snapshotId: string } {
  const dir = path.join(appRoot, "fixtures", scenario)
  const name = readdirSync(dir)
    .filter((entry) => /^snapshot-\d+\.json$/.test(entry))
    .sort()[index]
  if (!name) throw new Error(`missing snapshot ${index} in ${scenario}`)
  const envelope = parseEnvelope(readFileSync(path.join(dir, name), "utf8"))
  const parsed = envelope.ok ? treeFromEnvelope(envelope.data) : null
  if (!parsed) throw new Error(`snapshot ${name} has no tree`)
  return parsed
}
