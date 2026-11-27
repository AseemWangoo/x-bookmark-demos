import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import type { RunView } from "../../shared/types.ts"
import { describeEvent, formatTime } from "./format.ts"

export function Timeline({ view }: { view: RunView | null }) {
  const events = view?.timeline ?? []
  return (
    <section aria-labelledby="timeline-heading" data-testid="timeline">
      <Card>
        <CardHeader>
          <h2 id="timeline-heading" className="text-base font-medium">
            Timeline
          </h2>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ScrollArea className="h-64">
              <ol className="flex flex-col gap-2 pe-3" aria-label="Run timeline">
                {events.map((event, index) => (
                  <li key={`${event.type}-${event.at}-${index}`} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 text-sm">
                    <time dateTime={event.at} className="text-muted-foreground">
                      {formatTime(event.at)}
                    </time>
                    <span>{describeEvent(event)}</span>
                  </li>
                ))}
              </ol>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
