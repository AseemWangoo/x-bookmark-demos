import { ArrowDownWideNarrow, Clipboard, Download, ListOrdered } from "lucide-react"

import { Button } from "@/components/ui/button"

import type {
  EditableField,
  FieldValue,
  FormTemplate,
} from "../lib/types"
import { FieldRow } from "./FieldRow"

interface FormPanelProps {
  template: FormTemplate
  fields: EditableField[]
  activeKey: string | null
  reviewSort: boolean
  onSort: () => void
  onActive: (key: string | null) => void
  onChange: (key: string, value: FieldValue) => void
  onReset: (key: string) => void
  onDownload: () => void
  onCopy: () => void
}

export function FormPanel({
  template,
  fields,
  activeKey,
  reviewSort,
  onSort,
  onActive,
  onChange,
  onReset,
  onDownload,
  onCopy,
}: FormPanelProps) {
  const ordered = [...fields].sort((a, b) => {
    if (!reviewSort) {
      return (
        template.fields.findIndex((field) => field.key === a.key) -
        template.fields.findIndex((field) => field.key === b.key)
      )
    }
    if (a.value === null && b.value !== null) return -1
    if (b.value === null && a.value !== null) return 1
    return a.confidence - b.confidence
  })

  return (
    <section className="form-shell">
      <div className="form-toolbar">
        <div>
          <p className="eyebrow">Structured output</p>
          <h2>{template.title}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onSort} data-testid="sort-toggle">
          {reviewSort ? <ListOrdered /> : <ArrowDownWideNarrow />}
          {reviewSort ? "Template order" : "Review queue"}
        </Button>
      </div>
      <div className="form-actions">
        <Button size="sm" onClick={onDownload} data-testid="export-download">
          <Download />
          Export JSON
        </Button>
        <Button variant="outline" size="sm" onClick={onCopy}>
          <Clipboard />
          Copy
        </Button>
      </div>
      <div className="fields-scroll">
        {ordered.map((field) => {
          const definition = template.fields.find(
            (candidate) => candidate.key === field.key,
          )
          if (!definition) return null
          return (
            <FieldRow
              key={field.key}
              definition={definition}
              field={field}
              active={activeKey === field.key}
              onActive={onActive}
              onChange={onChange}
              onReset={onReset}
            />
          )
        })}
      </div>
    </section>
  )
}
