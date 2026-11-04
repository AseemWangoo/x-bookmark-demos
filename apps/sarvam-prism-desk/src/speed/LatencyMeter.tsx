import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { percentile } from "@/lib/stats";
import { Sparkline } from "./Sparkline";

export function LatencyMeter({
  serverMs,
  e2eMs,
  samples,
  synthetic,
}: {
  serverMs: number | null;
  e2eMs: number | null;
  samples: number[];
  synthetic: boolean;
}) {
  const clamped = serverMs === null ? 0 : Math.min(serverMs, 500);
  const p50 = percentile(samples, 50);
  const p95 = percentile(samples, 95);
  return (
    <Card size="sm" data-testid="latency-meter">
      <CardHeader className="flex-row items-baseline justify-between">
        <CardTitle>Latency</CardTitle>
        {synthetic ? (
          <span className="text-[11px] text-muted-foreground" data-testid="synthetic-latency">
            synthetic latency
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-medium tabular-nums" data-testid="server-ms">
            {serverMs === null ? "—" : Math.round(serverMs)}
          </span>
          <span className="text-xs text-muted-foreground">ms round trip</span>
          <span className="ml-auto text-[11px] text-muted-foreground" data-testid="e2e-ms">
            {e2eMs === null ? "" : `${Math.round(e2eMs)} ms end-to-end`}
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${(clamped / 500) * 100}%` }} />
          <div
            data-testid="claim-44"
            className="absolute top-[-3px] h-3.5 w-0.5 bg-foreground"
            style={{ left: `${(44 / 500) * 100}%` }}
          />
          <div
            data-testid="claim-100"
            className="absolute top-[-3px] h-3.5 w-px bg-foreground/50"
            style={{ left: `${(100 / 500) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0</span>
          <span>44 ms claim · B200</span>
          <span>100 ms</span>
          <span>500</span>
        </div>
        <Sparkline values={samples} />
        <p className="text-[11px] text-muted-foreground" data-testid="latency-stats">
          p50 {samples.length ? Math.round(p50) : "—"} ms · p95 {samples.length ? Math.round(p95) : "—"} ms ·{" "}
          {samples.length} requests
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          44 ms is Sarvam’s model-side median on one B200, not the hosted round trip. p95 on that run was 420 ms.
        </p>
      </CardContent>
    </Card>
  );
}
