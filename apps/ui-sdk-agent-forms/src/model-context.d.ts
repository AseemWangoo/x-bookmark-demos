interface ModelContext {
  registerTool?: (...args: never[]) => unknown
}

interface Document {
  modelContext?: ModelContext
}
