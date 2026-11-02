import { useEffect, useRef } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { StepLog as StepLogEntry } from "@/lib/types"
import { StepRow } from "./StepRow"

export function StepLog({
  steps,
  onFocusRef,
}: {
  steps: StepLogEntry[]
  onFocusRef: (ref: string, snapshotId: string | null) => void
}) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [steps.length])
  return (
    <section className="flex min-h-0 flex-col" data-testid="step-log">
      <div className="border-b px-3 py-1.5">
        <h2 className="text-xs font-medium tracking-wide uppercase">Steps</h2>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {steps.length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            Run a preset. Each row shows the command, the qualified ref, the snapshot id, delivery, and duration.
          </p>
        ) : (
          steps.map((step) => <StepRow key={step.index} step={step} onFocusRef={onFocusRef} />)
        )}
        <div ref={endRef} />
      </ScrollArea>
    </section>
  )
}
