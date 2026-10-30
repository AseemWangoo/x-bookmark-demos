import { RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type {
  EditableField,
  FieldValue,
  TemplateField,
} from "../lib/types"
import { ConfidenceBadge } from "./ConfidenceBadge"

interface FieldRowProps {
  definition: TemplateField
  field: EditableField
  active: boolean
  onActive: (key: string | null) => void
  onChange: (key: string, value: FieldValue) => void
  onReset: (key: string) => void
}

export function FieldRow({
  definition,
  field,
  active,
  onActive,
  onChange,
  onReset,
}: FieldRowProps) {
  const value = field.value
  const setTextValue = (raw: string) => {
    if (definition.type === "number") {
      onChange(field.key, raw === "" ? null : Number(raw))
      return
    }
    onChange(field.key, raw === "" ? null : raw)
  }

  return (
    <div
      id={`field-${field.key}`}
      className={`field-row ${active ? "field-row-active" : ""}`}
      data-field-key={field.key}
      onMouseEnter={() => onActive(field.key)}
      onMouseLeave={() => onActive(null)}
    >
      <div className="field-heading">
        <label htmlFor={`input-${field.key}`}>
          {definition.label}
          {definition.unit ? <span> · {definition.unit}</span> : null}
        </label>
        <div className="field-badges">
          {value === null ? <Badge variant="secondary">Null</Badge> : null}
          {field.edited ? <Badge variant="secondary">edited</Badge> : null}
          <ConfidenceBadge confidence={field.confidence} />
        </div>
      </div>

      <div className="field-control">
        {definition.type === "enum" ? (
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(next) => onChange(field.key, next)}
          >
            <SelectTrigger id={`input-${field.key}`}>
              <SelectValue placeholder="Null" />
            </SelectTrigger>
            <SelectContent>
              {definition.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : definition.type === "boolean" ? (
          <label className="boolean-control" htmlFor={`input-${field.key}`}>
            <Checkbox
              id={`input-${field.key}`}
              checked={value === true}
              onCheckedChange={(checked) => onChange(field.key, checked)}
            />
            {value === null ? "Not captured" : value ? "Yes" : "No"}
          </label>
        ) : (
          <Input
            id={`input-${field.key}`}
            type={definition.type === "number" ? "number" : definition.type}
            value={value === null ? "" : String(value)}
            placeholder="Null"
            step={definition.type === "number" ? "any" : undefined}
            onFocus={() => onActive(field.key)}
            onChange={(event) => setTextValue(event.target.value)}
          />
        )}
        {field.edited ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Reset ${definition.label}`}
            title="Reset to model value"
            onClick={() => onReset(field.key)}
          >
            <RotateCcw />
          </Button>
        ) : null}
      </div>
      <div className="field-meta">
        {!field.bbox ? <span>No region</span> : <span>Source linked</span>}
        {field.note ? <span>{field.note}</span> : null}
      </div>
    </div>
  )
}
