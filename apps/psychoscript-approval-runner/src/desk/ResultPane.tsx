import { Card, CardContent, CardHeader } from "@/components/ui/card"

import type { RunView } from "../../shared/types.ts"
import { formatJson } from "./format.ts"

export function ResultPane({ view }: { view: RunView | null }) {
  const result = view?.status === "finished" ? view.result : null
  return (
    <article aria-labelledby="result-heading" data-testid="result">
      <Card>
        <CardHeader>
          <h2 id="result-heading" className="text-base font-medium">
            Result
          </h2>
        </CardHeader>
        <CardContent>
          {result === null ? (
            <p className="text-sm text-muted-foreground">The run has not finished.</p>
          ) : result.ok ? (
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
              {formatJson(result.value)}
            </pre>
          ) : (
            <p className="text-sm">
              <span className="font-medium">{result.error.kind}</span>
              <span className="text-muted-foreground"> · {result.error.message}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </article>
  )
}
