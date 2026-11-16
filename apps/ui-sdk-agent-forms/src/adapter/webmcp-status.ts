import type { WebMcpStatus } from "./types"

export function webMcpStatus(registerTool: unknown): WebMcpStatus {
  const registerToolType = typeof registerTool
  const supported = registerToolType === "function"
  return {
    registerToolType,
    supported,
    summary: supported
      ? "document.modelContext.registerTool is a function. WebMCP registration can reach a browser agent from this page."
      : "document.modelContext.registerTool is not a function. registerTools is a no-op in this browser. In-page snapshot, query, and act still work.",
  }
}

export function readWebMcpStatus(): WebMcpStatus {
  const registerTool =
    typeof document === "undefined" ? undefined : document.modelContext?.registerTool
  return webMcpStatus(registerTool)
}
