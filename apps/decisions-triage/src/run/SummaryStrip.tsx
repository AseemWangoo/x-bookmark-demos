import type { TriageBatch } from "@/lib/types";
import { formatMs, formatTokens, formatUsd } from "@/lib/format";
import { maxLatency, percentile50 } from "@/lib/metrics";
import { costPerThousand, PRICING_SOURCES } from "@/lib/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="gap-1 py-3">
      <CardHeader className="px-3">
        <CardTitle className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-3">
        <div className="text-lg font-medium tabular-nums">{value}</div>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function SummaryStrip({ batch, messageCount }: { batch: TriageBatch; messageCount: number }) {
  const latencies = batch.rows.map((row) => row.latencyMs);
  const timing = batch.synthetic ? "Illustrative timings" : "Measured";
  return (
    <section className="flex flex-col gap-3" data-testid="summary-strip">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Batch summary</h2>
        <p className="text-xs text-muted-foreground">
          {timing}. Costs are estimated.{" "}
          <a className="underline" href={PRICING_SOURCES.decisions} target="_blank" rel="noreferrer">
            Decisions pricing
          </a>
          {" · "}
          <a className="underline" href={PRICING_SOURCES.model} target="_blank" rel="noreferrer">
            gpt-6-luna
          </a>
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Stat label="Batch time" value={formatMs(batch.batchMs)} hint={timing} />
        <Stat label="p50 latency" value={formatMs(percentile50(latencies))} hint={timing} />
        <Stat label="Max latency" value={formatMs(maxLatency(latencies))} hint={timing} />
        <Stat label="Input tokens" value={formatTokens(batch.usage.input_tokens)} hint="estimated" />
        <Stat
          label="Cached tokens"
          value={formatTokens(batch.usage.input_tokens_details.cached_tokens)}
          hint="included in input"
        />
        <Stat label="Est. cost" value={formatUsd(batch.costUsd)} hint="estimated" />
        <Stat
          label="Per 1K messages"
          value={formatUsd(costPerThousand(batch.costUsd, messageCount))}
          hint="estimated"
        />
      </div>
    </section>
  );
}
