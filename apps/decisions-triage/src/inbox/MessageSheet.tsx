import type { InboxMessage, TriageRow } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function MessageSheet({
  message,
  decision,
  response,
  onOpenChange,
}: {
  message: InboxMessage | null;
  decision?: TriageRow;
  response?: TriageRow;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={message !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl"
        data-testid="message-sheet"
        style={{ width: "min(40rem, 100vw)", maxWidth: "40rem" }}
      >
        {message ? (
          <>
            <SheetHeader>
              <SheetTitle>{message.subject}</SheetTitle>
              <SheetDescription>
                {message.from} · {message.channel} · {message.receivedAt}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{message.channel}</Badge>
                <Badge variant="secondary">
                  expected {message.expected.urgent ? "urgent" : "not urgent"} · {message.expected.route} · P
                  {message.expected.priority}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Decisions answers</h3>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-5">
                  {decision ? JSON.stringify(decision.raw, null, 2) : "Not run yet."}
                </pre>
              </section>
              {response ? (
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Responses output
                  </h3>
                  <p className="text-[11px] text-muted-foreground">No probabilities. This is the strict JSON object.</p>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-5">
                    {JSON.stringify(response.raw, null, 2)}
                  </pre>
                </section>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
