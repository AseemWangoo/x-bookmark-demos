import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

import { RECORDED_PROMPTS } from "../form/templates"

type PromptBarProps = {
  prompt: string
  onPrompt: (prompt: string) => void
  onBuild: () => void
  onPick: (prompt: string) => void
}

export function PromptBar({ prompt, onPrompt, onBuild, onPick }: PromptBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="form-prompt" className="text-sm font-medium">
          Describe a form
        </label>
        <Badge variant="outline">Recorded templates</Badge>
      </div>
      <Textarea
        id="form-prompt"
        value={prompt}
        rows={3}
        className="min-h-24 text-base md:text-base"
        onChange={(event) => onPrompt(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {RECORDED_PROMPTS.map((entry) => (
          <Button
            key={entry.id}
            type="button"
            variant="outline"
            className="min-h-12"
            onClick={() => onPick(entry.prompt)}
          >
            {entry.label}
          </Button>
        ))}
        <Button type="button" className="min-h-12" onClick={onBuild}>
          Build form
        </Button>
      </div>
    </div>
  )
}
