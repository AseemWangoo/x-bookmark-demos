import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import type { StepLog } from "@/lib/types"

export function StepRow({
  step,
  onFocusRef,
}: {
  step: StepLog
  onFocusRef: (ref: string, snapshotId: string | null) => void
}) {
  const command = step.argv.length > 0 ? step.argv.join(" ") : step.intent
  return (
    <Collapsible>
      <div
        className="grid grid-cols-[1.5rem_minmax(0,1.3fr)_minmax(0,1.4fr)_auto] gap-x-2 gap-y-1 border-b px-3 py-1.5 text-[11px]"
        data-testid="step-row"
        data-index={step.index}
      >
        <div className="font-mono text-muted-foreground">#{step.index}</div>
        <div className="min-w-0">
          <div className="truncate font-medium">{step.intent}</div>
          <div className="truncate font-mono text-[10px] text-muted-foreground" title={command}>
            {command}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {step.refs.map((ref) => (
            <button
              key={ref}
              type="button"
              data-testid="ref-chip"
              data-ref={ref}
              className="rounded bg-muted px-1 font-mono text-[10px]"
              onClick={() => onFocusRef(ref, step.snapshotId)}
            >
              {ref}
            </button>
          ))}
          {step.snapshotId ? (
            <span className="font-mono text-[10px] text-muted-foreground">{step.snapshotId}</span>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-1">
          <Badge variant={step.ok ? "secondary" : "destructive"} className="h-4 px-1.5 text-[10px]">
            {step.ok ? "ok" : step.code}
          </Badge>
          {step.delivery ? (
            <span className="text-[10px] text-muted-foreground">{step.delivery}</span>
          ) : null}
          {step.mechanism ? (
            <span className="text-[10px] text-muted-foreground">{step.mechanism}</span>
          ) : null}
          <span className="w-10 text-right font-mono text-[10px] text-muted-foreground">{step.ms}ms</span>
          <CollapsibleTrigger
            className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
            data-testid="envelope-toggle"
          >
            JSON
          </CollapsibleTrigger>
        </div>
        {!step.ok && step.suggestion ? (
          <div className="col-span-4 text-[10px] text-destructive">
            {step.suggestion}
            {step.retrySafe ? " · retry safe" : ""}
          </div>
        ) : null}
        <CollapsibleContent className="col-span-4">
          <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 font-mono text-[10px] leading-4 whitespace-pre-wrap">
            {JSON.stringify({ envelope: step.envelope, stderr: step.stderr }, null, 2)}
          </pre>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
