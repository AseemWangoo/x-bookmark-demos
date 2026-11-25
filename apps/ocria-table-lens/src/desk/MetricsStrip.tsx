import type { TranscribeResult } from "../../shared/types.ts";

export function MetricsStrip({ result }: { result: TranscribeResult }) {
  return (
    <section
      aria-label="Run metrics"
      className="grid gap-3 rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10"
      data-testid="metrics-strip"
    >
      <h2 className="text-base font-medium">Run</h2>
      <dl className="grid gap-2 sm:grid-cols-3">
        <Metric label="Wall clock" value={`${result.wallMs} ms`} />
        <Metric label="Model" value={result.model} />
        <Metric label="Source" value={result.source} />
        <Metric label="done_reason" value={result.doneReason ?? "—"} />
        <Metric label="Prompt tokens" value={result.usage ? String(result.usage.promptTokens) : "—"} />
        <Metric label="Eval tokens" value={result.usage ? String(result.usage.evalTokens) : "—"} />
      </dl>
      {result.source === "mock" ? (
        <p className="text-muted-foreground">Recorded sample. No token counts — no model call.</p>
      ) : null}
      {result.warning ? (
        <p role="alert" className="text-destructive">
          {result.warning}
        </p>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
