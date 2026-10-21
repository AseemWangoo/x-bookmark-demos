import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FIELD_TYPES, type FieldSpec, type FieldType, type ListItemType } from "@/lib/types";

type FieldBuilderProps = {
  fields: FieldSpec[];
  canReset: boolean;
  onChange: (fields: FieldSpec[]) => void;
  onReset: () => void;
};

export function FieldBuilder({ fields, canReset, onChange, onReset }: FieldBuilderProps) {
  function update(index: number, patch: Partial<FieldSpec>) {
    onChange(fields.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...patch } : field)));
  }

  function changeType(index: number, type: FieldType) {
    const current = fields[index];
    if (!current) return;
    const next: FieldSpec = { name: current.name, type, instructions: current.instructions };
    if (type === "number") {
      next.decimals = current.decimals ?? 2;
      next.unit = current.unit ?? "USD";
    }
    if (type === "duration") {
      next.unit = current.unit ?? "days";
      next.integer = current.integer ?? true;
    }
    if (type === "list") next.items = current.items ?? "text";
    onChange(fields.map((field, fieldIndex) => (fieldIndex === index ? next : field)));
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Fields</h2>
        <div className="flex gap-1.5">
          <Button type="button" size="sm" variant="outline" disabled={!canReset} onClick={onReset}>
            Reset preset
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="add-field"
            onClick={() => onChange([...fields, { name: "", type: "text" }])}
          >
            Add field
          </Button>
        </div>
      </div>
      <div className="flex max-h-80 flex-col gap-2 overflow-auto pr-1">
        {fields.map((field, index) => (
          <div key={index} className="rounded-lg border p-2">
            <div className="grid grid-cols-[minmax(0,1fr)_8.5rem_auto] gap-2">
              <Input
                aria-label={`Field ${index + 1} name`}
                value={field.name}
                placeholder="snake_case"
                onChange={(event) => update(index, { name: event.target.value })}
                className="font-mono"
              />
              <Select value={field.type} onValueChange={(value) => changeType(index, value as FieldType)}>
                <SelectTrigger aria-label={`Field ${index + 1} type`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Remove ${field.name || "field"}`}
                onClick={() => onChange(fields.filter((_, fieldIndex) => fieldIndex !== index))}
              >
                Remove
              </Button>
            </div>
            <Input
              aria-label={`Field ${index + 1} instructions`}
              value={field.instructions ?? ""}
              placeholder="Instructions (optional)"
              onChange={(event) =>
                update(index, { instructions: event.target.value || undefined })
              }
              className="mt-2"
            />
            <TypeOptions field={field} index={index} onUpdate={update} />
          </div>
        ))}
      </div>
    </section>
  );
}

function TypeOptions({
  field,
  index,
  onUpdate,
}: {
  field: FieldSpec;
  index: number;
  onUpdate: (index: number, patch: Partial<FieldSpec>) => void;
}) {
  switch (field.type) {
    case "text":
    case "date":
    case "time":
    case "datetime":
      return null;
    case "number":
      return (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Decimals
            <Input
              aria-label={`Field ${index + 1} decimals`}
              type="number"
              min={0}
              max={8}
              value={field.decimals ?? 2}
              onChange={(event) => onUpdate(index, { decimals: Number(event.target.value) })}
              className="h-7 w-16"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Unit
            <Input
              aria-label={`Field ${index + 1} unit`}
              value={field.unit ?? ""}
              onChange={(event) => onUpdate(index, { unit: event.target.value || undefined })}
              className="h-7 w-20"
            />
          </label>
          <IntegerToggle field={field} index={index} onUpdate={onUpdate} />
        </div>
      );
    case "duration":
      return (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Unit
            <Input
              aria-label={`Field ${index + 1} unit`}
              value={field.unit ?? ""}
              onChange={(event) => onUpdate(index, { unit: event.target.value || undefined })}
              className="h-7 w-24"
            />
          </label>
          <IntegerToggle field={field} index={index} onUpdate={onUpdate} />
        </div>
      );
    case "list":
      return (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Items</span>
          <Select
            value={field.items ?? "text"}
            onValueChange={(value) => onUpdate(index, { items: value as ListItemType })}
          >
            <SelectTrigger aria-label={`Field ${index + 1} item type`} className="h-7 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">text</SelectItem>
              <SelectItem value="number">number</SelectItem>
              <SelectItem value="date">date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    default: {
      const exhaustive: never = field.type;
      return exhaustive;
    }
  }
}

function IntegerToggle({
  field,
  index,
  onUpdate,
}: {
  field: FieldSpec;
  index: number;
  onUpdate: (index: number, patch: Partial<FieldSpec>) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <Switch
        size="sm"
        checked={field.integer ?? false}
        onCheckedChange={(checked) => onUpdate(index, { integer: checked })}
        aria-label={`Field ${index + 1} integer`}
      />
      Integer
    </label>
  );
}
