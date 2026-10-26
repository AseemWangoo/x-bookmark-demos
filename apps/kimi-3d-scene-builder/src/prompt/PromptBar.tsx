import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Effort, ExampleScene, ModelChoice } from "@/lib/types";
import { ExampleChips } from "./ExampleChips";
import { EffortSelect } from "./EffortSelect";
import { ModelToggle } from "./ModelToggle";

export function PromptBar({
  prompt,
  onPrompt,
  model,
  onModel,
  effort,
  onEffort,
  examples,
  sceneId,
  hasScene,
  running,
  onGenerate,
  onEdit,
  onNewScene,
}: {
  prompt: string;
  onPrompt: (value: string) => void;
  model: ModelChoice;
  onModel: (value: ModelChoice) => void;
  effort: Effort;
  onEffort: (value: Effort) => void;
  examples: ExampleScene[];
  sceneId: string | null;
  hasScene: boolean;
  running: boolean;
  onGenerate: (prompt: string) => void;
  onEdit: (prompt: string) => void;
  onNewScene: () => void;
}) {
  const trimmed = prompt.trim().toLowerCase();
  const matchesExample = examples.some((example) => example.prompt.toLowerCase() === trimmed);
  const label = !hasScene || matchesExample ? "Generate" : "Apply edit";

  function submit() {
    if (!prompt.trim()) return;
    if (label === "Generate") onGenerate(prompt.trim());
    else onEdit(prompt.trim());
  }

  return (
    <div className="flex flex-col gap-2 border-b px-4 py-3">
      <div className="flex flex-wrap items-end gap-2">
        <Textarea
          value={prompt}
          onChange={(event) => onPrompt(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="a low-poly lighthouse on a rocky island at sunset"
          rows={2}
          data-testid="prompt"
          className="min-w-[280px] flex-1 resize-none"
        />
        <Button type="button" data-testid="submit" disabled={running || !prompt.trim()} onClick={submit}>
          {running ? "Streaming…" : label}
        </Button>
        <Button type="button" variant="outline" data-testid="new-scene" disabled={running} onClick={onNewScene}>
          New scene
        </Button>
        <ModelToggle value={model} onChange={onModel} disabled={running} />
        <EffortSelect value={effort} onChange={onEffort} disabled={running} />
      </div>
      <ExampleChips
        examples={examples}
        sceneId={sceneId}
        disabled={running}
        onGenerate={onGenerate}
        onEdit={onEdit}
      />
    </div>
  );
}
