import { Button } from "@/components/ui/button";
import type { ExampleScene } from "@/lib/types";

export function ExampleChips({
  examples,
  sceneId,
  disabled,
  onGenerate,
  onEdit,
}: {
  examples: ExampleScene[];
  sceneId: string | null;
  disabled?: boolean;
  onGenerate: (prompt: string) => void;
  onEdit: (prompt: string) => void;
}) {
  const active = examples.find((example) => example.id === sceneId);
  return (
    <div className="flex flex-wrap gap-1.5">
      {examples.map((example) => (
        <Button
          key={example.id}
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          data-testid={`chip-${example.id}`}
          onClick={() => onGenerate(example.prompt)}
        >
          {example.prompt}
        </Button>
      ))}
      {active?.edits.map((edit) => (
        <Button
          key={edit}
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          data-testid={`chip-edit-${edit.replace(/\s+/g, "-")}`}
          onClick={() => onEdit(edit)}
        >
          {edit}
        </Button>
      ))}
    </div>
  );
}
