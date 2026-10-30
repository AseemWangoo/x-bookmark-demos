import type {
  EditableField,
  ExtractionResponse,
  FormTemplate,
  SourceImage,
} from "./types"

export function buildExport(args: {
  source: SourceImage
  template: FormTemplate
  extraction: ExtractionResponse
  fields: EditableField[]
  extractedAt: string
}) {
  return {
    source: {
      name: args.source.name,
      width: args.source.width,
      height: args.source.height,
    },
    template: args.template.id,
    model: args.extraction.model,
    mode: args.extraction.mode,
    extractedAt: args.extractedAt,
    fields: args.fields.map((field) => {
      const templateField = args.template.fields.find(
        (candidate) => candidate.key === field.key,
      )
      return {
        key: field.key,
        label: templateField?.label ?? field.key,
        value: field.value,
        modelValue: field.modelValue,
        edited: field.edited,
        confidence: field.confidence,
        bbox: field.bbox,
      }
    }),
    usage: args.extraction.usage,
  }
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${name.replace(/\.[^.]+$/, "")}.terra.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
