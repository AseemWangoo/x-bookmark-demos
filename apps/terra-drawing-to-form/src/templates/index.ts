import { drawingTemplate } from "./drawing"
import { serviceFormTemplate } from "./service-form"
import { specSheetTemplate } from "./spec-sheet"

export const templates = [drawingTemplate, serviceFormTemplate, specSheetTemplate]

export function getTemplate(id: string) {
  return templates.find((template) => template.id === id)
}
