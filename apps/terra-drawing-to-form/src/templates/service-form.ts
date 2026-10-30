import type { FormTemplate } from "../lib/types"

export const serviceFormTemplate: FormTemplate = {
  id: "service-request-form",
  title: "Service request",
  description: "Equipment maintenance intake form",
  fields: [
    { key: "request_id", label: "Request ID", type: "text" },
    { key: "request_date", label: "Request date", type: "date" },
    { key: "requester", label: "Requested by", type: "text" },
    { key: "department", label: "Department", type: "text" },
    { key: "equipment_id", label: "Equipment ID", type: "text" },
    { key: "equipment_type", label: "Equipment type", type: "text" },
    { key: "priority", label: "Priority", type: "enum", options: ["Routine", "Urgent", "Emergency"] },
    { key: "out_of_service", label: "Out of service", type: "boolean" },
    { key: "issue", label: "Issue description", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "contact_phone", label: "Contact phone", type: "text" },
    { key: "signature", label: "Signature", type: "text" },
  ],
}
