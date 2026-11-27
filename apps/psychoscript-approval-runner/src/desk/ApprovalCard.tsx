import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

import type { RunView } from "../../shared/types.ts"
import { formatJson } from "./format.ts"

export function ApprovalCard({
  view,
  busy,
  onDecide,
}: {
  view: RunView | null
  busy: boolean
  onDecide: (decision: "approve" | "reject") => void
}) {
  const pending = view?.status === "suspended" ? view.pending : null
  if (!pending || view?.snapshotBytes == null) {
    return (
      <article aria-labelledby="approval-heading">
        <Card>
          <CardHeader>
            <h2 id="approval-heading" className="text-base font-medium">
              Approval
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No risky call is waiting. searchDocs returns immediately. sendEmail and chargeCard pause here.
            </p>
          </CardContent>
        </Card>
      </article>
    )
  }

  return (
    <article aria-labelledby="approval-heading" data-testid="approval-card">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <h2 id="approval-heading" className="text-base font-medium">
              Pending approval
            </h2>
            <Badge variant="outline">Suspended</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3">
            <div>
              <dt className="text-xs text-muted-foreground">Tool</dt>
              <dd className="font-medium" data-testid="pending-tool">
                {pending.name}()
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Arguments</dt>
              <dd>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
                  {formatJson(pending.args)}
                </pre>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Call key</dt>
              <dd className="font-mono text-xs break-all">{pending.key}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Snapshot</dt>
              <dd className="font-medium" data-testid="snapshot-bytes">
                {view.snapshotBytes} bytes
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">
            Saved on disk. Reload the page or restart the server and this card comes back.
          </p>
        </CardContent>
        <CardFooter className="gap-2">
          <Button
            type="button"
            className="min-h-12 px-4"
            disabled={busy}
            data-testid="approve"
            onClick={() => {
              onDecide("approve")
            }}
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-12 px-4"
            disabled={busy}
            data-testid="reject"
            onClick={() => {
              onDecide("reject")
            }}
          >
            Reject
          </Button>
        </CardFooter>
      </Card>
    </article>
  )
}
