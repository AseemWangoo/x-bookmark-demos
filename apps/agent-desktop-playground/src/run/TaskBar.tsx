import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export const presets = [
  { id: "todo", label: "To-do list", prompt: "Open the text editor and write a to-do list" },
  { id: "calculator", label: "12 × 7", prompt: "Open the calculator and compute 12 × 7" },
  { id: "append", label: "Append line", prompt: "In the text editor, append 'Ship the demo'" },
] as const

export function TaskBar({
  prompt,
  running,
  onPrompt,
  onRun,
}: {
  prompt: string
  running: boolean
  onPrompt: (value: string) => void
  onRun: () => void
}) {
  return (
    <form
      className="flex items-center gap-2 border-b px-3 py-2"
      onSubmit={(event) => {
        event.preventDefault()
        onRun()
      }}
    >
      <div className="flex shrink-0 gap-1">
        {presets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="xs"
            variant={prompt === preset.prompt ? "default" : "outline"}
            data-testid={`preset-${preset.id}`}
            onClick={() => onPrompt(preset.prompt)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <Input
        value={prompt}
        onChange={(event) => onPrompt(event.target.value)}
        aria-label="Task"
        data-testid="prompt"
        placeholder="Plain-English desktop task"
        className="h-7 text-xs"
      />
      <Button type="submit" size="sm" disabled={running || prompt.trim().length === 0} data-testid="run-button">
        {running ? "Running" : "Run"}
      </Button>
    </form>
  )
}
