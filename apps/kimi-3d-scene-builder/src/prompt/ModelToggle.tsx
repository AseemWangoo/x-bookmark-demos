import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ModelChoice } from "@/lib/types";

export function ModelToggle({
  value,
  onChange,
  disabled,
}: {
  value: ModelChoice;
  onChange: (value: ModelChoice) => void;
  disabled?: boolean;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next === "pro" || next === "highspeed") onChange(next);
      }}
      aria-label="Model"
    >
      <ToggleGroupItem value="pro" data-testid="model-pro" aria-label="Pro">
        Pro
      </ToggleGroupItem>
      <ToggleGroupItem value="highspeed" data-testid="model-highspeed" aria-label="Highspeed">
        Highspeed
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
