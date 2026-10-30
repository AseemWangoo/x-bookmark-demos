import type { FormTemplate } from "../lib/types"

export const specSheetTemplate: FormTemplate = {
  id: "motor-spec-sheet",
  title: "Motor spec sheet",
  description: "Electrical and mechanical ratings",
  fields: [
    { key: "model", label: "Model", type: "text" },
    { key: "rated_power", label: "Rated power", type: "number", unit: "kW" },
    { key: "voltage", label: "Voltage", type: "number", unit: "V" },
    { key: "current", label: "Current", type: "number", unit: "A" },
    { key: "speed", label: "Speed", type: "number", unit: "rpm" },
    { key: "frequency", label: "Frequency", type: "number", unit: "Hz" },
    { key: "ip_rating", label: "IP rating", type: "text" },
    { key: "insulation_class", label: "Insulation class", type: "enum", options: ["A", "B", "F", "H"] },
    { key: "efficiency", label: "Efficiency", type: "number", unit: "%" },
    { key: "weight", label: "Weight", type: "number", unit: "kg" },
  ],
}
