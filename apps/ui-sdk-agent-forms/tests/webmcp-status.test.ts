import { describe, expect, test } from "bun:test"

import { webMcpStatus } from "../src/adapter/webmcp-status"

describe("webMcpStatus", () => {
  test("treats a function as support", () => {
    const status = webMcpStatus(() => undefined)
    expect(status.registerToolType).toBe("function")
    expect(status.supported).toBe(true)
    expect(status.summary).toContain("document.modelContext.registerTool is a function")
  })

  test("treats a missing registerTool as a no-op", () => {
    const status = webMcpStatus(undefined)
    expect(status.registerToolType).toBe("undefined")
    expect(status.supported).toBe(false)
    expect(status.summary).toContain("no-op")
  })
})
