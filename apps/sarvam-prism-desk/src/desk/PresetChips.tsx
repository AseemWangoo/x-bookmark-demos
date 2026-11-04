import { Button } from "@/components/ui/button";
import { PRESETS } from "../../fixtures/presets";

export function PresetChips({
  activeId,
  onPick,
}: {
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((preset) => (
        <Button
          key={preset.id}
          type="button"
          size="xs"
          variant={activeId === preset.id ? "default" : "outline"}
          data-testid={`preset-${preset.id}`}
          onClick={() => onPick(preset.id)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
