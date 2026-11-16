import { Button } from "@ui-sdk/react/button"
import {
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
  DatePicker,
  DatePickerContent,
  DatePickerHint,
  DatePickerInput,
  DatePickerTrigger,
} from "@ui-sdk/react/date-picker"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@ui-sdk/react/combobox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@ui-sdk/react/field"
import { Input } from "@ui-sdk/react/input"
import {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from "@ui-sdk/react/number-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select"
import { Textarea } from "@ui-sdk/react/textarea"
import { CalendarIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useId, useState, type FormEvent } from "react"

import type { FieldSpec, FormSpec } from "../adapter/types"

const controlClass =
  "min-h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const popupClass =
  "z-50 max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none"

type FormCanvasProps = {
  spec: FormSpec
  onSubmitted: (summary: string) => void
}

export function FormCanvas({ spec, onSubmitted }: FormCanvasProps) {
  const headingId = useId()
  const [submitted, setSubmitted] = useState(false)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const lines = [...data.entries()].map(([key, value]) => `${key}: ${String(value)}`)
    setSubmitted(true)
    onSubmitted(lines.join("\n"))
  }

  return (
    <form
      aria-labelledby={headingId}
      method="post"
      action="#submitted"
      className="flex flex-col gap-5"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-xl font-medium tracking-tight">
          {spec.title}
        </h2>
        <p className="text-sm text-muted-foreground">{spec.description}</p>
      </div>
      {spec.fields.map((field) => (
        <FormField key={field.name} field={field} />
      ))}
      <div className="flex flex-col items-start gap-2">
        <Button
          type="submit"
          disabled={submitted}
          data-agent-confirm="Submit this form"
          className="inline-flex min-h-12 items-center rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        >
          {submitted ? "Submitted" : spec.submitLabel}
        </Button>
        <p className="max-w-prose text-sm text-muted-foreground">
          Tab through the fields. Arrow keys move in the date grid, the list, and the guest stepper. Escape closes a popup.
        </p>
      </div>
    </form>
  )
}

function FormField({ field }: { field: FieldSpec }) {
  switch (field.kind) {
    case "text":
      return <TextField field={field} />
    case "textarea":
      return <TextareaField field={field} />
    case "number":
      return <NumberField field={field} />
    case "select":
      return <SelectField field={field} />
    case "combobox":
      return <ComboboxField field={field} />
    case "date":
      return <DateField field={field} />
    default: {
      const exhaustive: never = field
      return exhaustive
    }
  }
}

function TextField({ field }: { field: Extract<FieldSpec, { kind: "text" }> }) {
  return (
    <Field name={field.name} className="flex flex-col gap-1.5">
      <FieldLabel className="text-sm font-medium">{field.label}</FieldLabel>
      <Input
        type={field.inputType}
        name={field.name}
        required={field.required}
        autoComplete={field.autoComplete}
        placeholder={field.placeholder}
        className={controlClass}
      />
      {field.description ? (
        <FieldDescription className="text-sm text-muted-foreground">
          {field.description}
        </FieldDescription>
      ) : null}
      {field.required ? (
        <FieldError match="valueMissing" className="text-sm text-destructive">
          Enter {field.label.toLowerCase()}.
        </FieldError>
      ) : null}
    </Field>
  )
}

function TextareaField({ field }: { field: Extract<FieldSpec, { kind: "textarea" }> }) {
  return (
    <Field name={field.name} className="flex flex-col gap-1.5">
      <FieldLabel className="text-sm font-medium">{field.label}</FieldLabel>
      <Textarea
        name={field.name}
        required={field.required}
        placeholder={field.placeholder}
        rows={4}
        className={`${controlClass} min-h-28 py-3`}
      />
      {field.description ? (
        <FieldDescription className="text-sm text-muted-foreground">
          {field.description}
        </FieldDescription>
      ) : null}
    </Field>
  )
}

function NumberField({ field }: { field: Extract<FieldSpec, { kind: "number" }> }) {
  return (
    <Field name={field.name} className="flex flex-col gap-1.5">
      <FieldLabel className="text-sm font-medium">{field.label}</FieldLabel>
      <NumberInput
        name={field.name}
        min={field.min}
        defaultValue={field.defaultValue}
        required={field.required}
      >
        <NumberInputGroup className="flex w-full max-w-xs overflow-hidden rounded-lg border border-input bg-background">
          <NumberInputDecrement
            aria-label={`Decrease ${field.label.toLowerCase()}`}
            className="inline-flex min-h-12 min-w-12 items-center justify-center text-lg outline-none focus-visible:bg-accent"
          >
            −
          </NumberInputDecrement>
          <NumberInputControl className="min-h-12 w-full border-x border-input bg-transparent px-3 text-center text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          <NumberInputIncrement
            aria-label={`Increase ${field.label.toLowerCase()}`}
            className="inline-flex min-h-12 min-w-12 items-center justify-center text-lg outline-none focus-visible:bg-accent"
          >
            +
          </NumberInputIncrement>
        </NumberInputGroup>
      </NumberInput>
      {field.description ? (
        <FieldDescription className="text-sm text-muted-foreground">
          {field.description}
        </FieldDescription>
      ) : null}
    </Field>
  )
}

function SelectField({ field }: { field: Extract<FieldSpec, { kind: "select" }> }) {
  return (
    <Field name={field.name} className="flex flex-col gap-1.5">
      <FieldLabel className="text-sm font-medium">{field.label}</FieldLabel>
      <Select
        name={field.name}
        items={field.items}
        required={field.required}
        placeholder={field.placeholder}
        modal
      >
        <SelectTrigger className={`${controlClass} flex items-center justify-between gap-2 text-left`}>
          <SelectValue />
          <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0" />
        </SelectTrigger>
        <SelectContent className={popupClass}>
          {field.items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              className="flex min-h-12 cursor-default items-center justify-between rounded-md px-3 text-base outline-none data-highlighted:bg-accent"
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {field.description ? (
        <FieldDescription className="text-sm text-muted-foreground">
          {field.description}
        </FieldDescription>
      ) : null}
      {field.required ? (
        <FieldError match="valueMissing" className="text-sm text-destructive">
          Choose {field.label.toLowerCase()}.
        </FieldError>
      ) : null}
    </Field>
  )
}

function ComboboxField({ field }: { field: Extract<FieldSpec, { kind: "combobox" }> }) {
  return (
    <Field name={field.name} className="flex flex-col gap-1.5">
      <FieldLabel className="text-sm font-medium">{field.label}</FieldLabel>
      <Combobox name={field.name} items={field.items} required={field.required} modal>
        <div className="flex gap-2">
          <ComboboxInput placeholder={field.placeholder} className={controlClass} />
          <ComboboxTrigger
            aria-label={`Show ${field.label.toLowerCase()} options`}
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg border border-input bg-background outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          </ComboboxTrigger>
        </div>
        <ComboboxContent className={popupClass}>
          <ComboboxEmpty className="px-3 py-3 text-sm text-muted-foreground">
            No matches.
          </ComboboxEmpty>
          <ComboboxList>
            {field.items.map((item) => (
              <ComboboxItem
                key={item.value}
                value={item.value}
                label={item.label}
                className="flex min-h-12 cursor-default items-center justify-between rounded-md px-3 text-base outline-none data-highlighted:bg-accent"
              >
                {item.label}
                <CheckIcon aria-hidden="true" className="size-4 opacity-0 in-data-selected:opacity-100" />
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {field.description ? (
        <FieldDescription className="text-sm text-muted-foreground">
          {field.description}
        </FieldDescription>
      ) : null}
      {field.required ? (
        <FieldError match="valueMissing" className="text-sm text-destructive">
          Choose {field.label.toLowerCase()}.
        </FieldError>
      ) : null}
    </Field>
  )
}

function DateField({ field }: { field: Extract<FieldSpec, { kind: "date" }> }) {
  const range = field.mode === "range"
  return (
    <Field className="flex flex-col gap-1.5">
      <FieldLabel className="text-sm font-medium">{field.label}</FieldLabel>
      <DatePicker
        mode={field.mode}
        name={range ? undefined : field.name}
        startName={field.startName}
        endName={field.endName}
        required={field.required}
      >
        <div className="flex flex-wrap items-center gap-2">
          <DatePickerInput
            aria-label={field.startLabel}
            placeholder={field.startLabel}
            autoComplete="off"
            className={`${controlClass} max-w-48`}
          />
          {range ? (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                –
              </span>
              <DatePickerInput
                end
                aria-label={field.endLabel}
                placeholder={field.endLabel}
                autoComplete="off"
                className={`${controlClass} max-w-48`}
              />
            </>
          ) : null}
          <DatePickerTrigger
            aria-label={range ? "Choose dates" : "Choose a date"}
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg border border-input bg-background outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CalendarIcon aria-hidden="true" className="size-4" />
          </DatePickerTrigger>
        </div>
        <DatePickerContent className={`${popupClass} w-fit p-3`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <CalendarPrevious
              aria-label="Previous month"
              className="inline-flex size-10 items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ChevronLeftIcon aria-hidden="true" className="size-4" />
            </CalendarPrevious>
            <CalendarHeading className="text-sm font-medium" />
            <CalendarNext
              aria-label="Next month"
              className="inline-flex size-10 items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ChevronRightIcon aria-hidden="true" className="size-4" />
            </CalendarNext>
          </div>
          <CalendarGrid className="w-full border-collapse text-sm">
            <CalendarWeekdays>
              {(index) => (
                <CalendarWeekday index={index} className="h-8 text-center text-xs font-medium text-muted-foreground" />
              )}
            </CalendarWeekdays>
            <CalendarWeeks>
              {(cell) => (
                <CalendarDay
                  value={cell.date}
                  className="size-10 rounded-md text-center outline-none data-disabled:text-muted-foreground data-outside:text-muted-foreground data-selected:bg-primary data-selected:text-primary-foreground data-today:font-semibold focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              )}
            </CalendarWeeks>
          </CalendarGrid>
        </DatePickerContent>
        <DatePickerHint className="text-sm text-muted-foreground" />
      </DatePicker>
      {field.description ? (
        <FieldDescription className="text-sm text-muted-foreground">
          {field.description}
        </FieldDescription>
      ) : null}
      {field.required ? (
        <FieldError match="valueMissing" className="text-sm text-destructive">
          Choose {field.label.toLowerCase()}.
        </FieldError>
      ) : null}
    </Field>
  )
}
