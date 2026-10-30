import type {
  Effort,
  ExtractionResponse,
  FormTemplate,
  Sample,
} from "./types"

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    const error = data as { error?: string; message?: string }
    if (error.error === "live_required") {
      throw new Error("Live mode needed to read your own image. Set OPENAI_API_KEY.")
    }
    throw new Error(error.message || error.error || "Request failed")
  }
  return data as T
}

export async function getMode() {
  return readJson<{ mode: "mock" | "live"; model: string }>(
    await fetch("/api/mode"),
  )
}

export async function getSamples() {
  return readJson<Sample[]>(await fetch("/api/samples"))
}

export async function getTemplates() {
  return readJson<FormTemplate[]>(await fetch("/api/templates"))
}

export async function extract(args: {
  templateId: string
  sampleId?: string
  imageDataUrl?: string
  width: number
  height: number
  effort: Effort
  forceMock: boolean
}) {
  return readJson<ExtractionResponse>(
    await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    }),
  )
}
