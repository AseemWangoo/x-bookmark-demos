import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Effort } from "@/lib/types";

const EFFORTS: Effort[] = ["low", "high", "max"];

export function EffortSelect({
  value,
  onChange,
  disabled,
}: {
  value: Effort;
  onChange: (value: Effort) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">
        Effort <span className="text-foreground/70">API default is max</span>
      </span>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next === "low" || next === "high" || next === "max") onChange(next);
        }}
      >
        <SelectTrigger className="w-[120px]" data-testid="effort" aria-label="Reasoning effort">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EFFORTS.map((effort) => (
            <SelectItem key={effort} value={effort}>
              {effort}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
