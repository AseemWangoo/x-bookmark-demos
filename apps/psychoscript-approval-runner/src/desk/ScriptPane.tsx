import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function ScriptPane({
  code,
  busy,
  onCode,
  onLoadSample,
  onRun,
}: {
  code: string
  busy: boolean
  onCode: (code: string) => void
  onLoadSample: () => void
  onRun: () => void
}) {
  return (
    <form
      className="flex flex-col gap-4"
      aria-labelledby="script-heading"
      action="/api/runs"
      method="post"
      onSubmit={(event) => {
        event.preventDefault()
        onRun()
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 id="script-heading" className="text-base font-medium">
          Agent script
        </h2>
        <p id="script-help" className="text-sm text-muted-foreground">
          Hand-authored fixture. Not model output and not an official OpenCode asset. Plain JavaScript only.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="agent-script" className="text-sm font-medium">
          Script
        </label>
        <Textarea
          id="agent-script"
          name="code"
          required
          value={code}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="none"
          aria-describedby="script-help"
          className="field-sizing-fixed h-64 resize-y overflow-auto font-mono text-base md:text-base"
          onChange={(event) => {
            onCode(event.target.value)
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-12 px-4"
          onClick={onLoadSample}
          disabled={busy}
          data-testid="load-sample"
        >
          Load sample
        </Button>
        <Button type="submit" className="min-h-12 px-4" disabled={busy} data-testid="run">
          Run
        </Button>
      </div>
    </form>
  )
}
