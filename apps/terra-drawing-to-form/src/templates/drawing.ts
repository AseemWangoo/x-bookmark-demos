import type { FormTemplate } from "../lib/types"

export const drawingTemplate: FormTemplate = {
  id: "bracket-drawing",
  title: "Technical drawing",
  description: "Dimensions and title-block metadata",
  fields: [
    { key: "part_no", label: "Part number", type: "text" },
    { key: "title", label: "Drawing title", type: "text" },
    { key: "material", label: "Material", type: "text" },
    { key: "finish", label: "Finish", type: "text" },
    { key: "scale", label: "Scale", type: "text" },
    { key: "drawn_by", label: "Drawn by", type: "text" },
    { key: "date", label: "Date", type: "date" },
    { key: "revision", label: "Revision", type: "text" },
    { key: "sheet", label: "Sheet", type: "text" },
    { key: "overall_length", label: "Overall length", type: "number", unit: "mm" },
    { key: "overall_height", label: "Overall height", type: "number", unit: "mm" },
    { key: "thickness", label: "Thickness", type: "number", unit: "mm" },
    { key: "hole_diameter", label: "Hole diameter", type: "number", unit: "mm" },
    { key: "hole_count", label: "Hole count", type: "number" },
    { key: "general_tolerance", label: "General tolerance", type: "text", unit: "mm" },
  ],
}
