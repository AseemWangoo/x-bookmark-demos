import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CONTEXT_NOTE, MOE_BADGE, MOE_NOTE } from "../../shared/copy.ts";
import type { ExtractResult } from "../../shared/types.ts";
import { effortLabel, formatCny, formatMs, formatUsd } from "../lib/labels.ts";

type MetricsStripProps = {
  result: ExtractResult | null;
};

export function MetricsStrip({ result }: MetricsStripProps) {
  const cost = result?.cost;
  const money = cost
    ? [
        cost.usd === null ? null : formatUsd(cost.usd),
        cost.cny === null ? null : formatCny(cost.cny),
      ].filter((part): part is string => part !== null)
    : [];
  return (
    <section
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-card px-3 py-2 text-xs ring-1 ring-foreground/10"
      data-testid="metrics-strip"
      aria-label="Latency and MoE metrics"
    >
      <Tooltip>
        <TooltipTrigger
          className="rounded-full border border-transparent"
          aria-label={MOE_NOTE}
        >
          <Badge>{MOE_BADGE}</Badge>
        </TooltipTrigger>
        <TooltipContent>{MOE_NOTE}</TooltipContent>
      </Tooltip>
      <span className="text-muted-foreground">{CONTEXT_NOTE}</span>
      {result ? (
        <>
          <Metric label="TTFT" value={formatMs(result.ttftMs)} />
          <Metric label="Total" value={formatMs(result.latencyMs)} />
          <Metric
            label={result.usage.estimated ? "In (est.)" : result.source === "mock" ? "In (canned)" : "In"}
            value={String(result.usage.inputTokens)}
          />
          <Metric label="Cached" value={String(result.usage.cachedTokens)} />
          <Metric label="Out" value={String(result.usage.outputTokens)} />
          <Metric label="Reasoning" value={String(result.usage.reasoningTokens)} />
          <span data-testid="cost-readout">
            <span className="text-muted-foreground">{cost?.estimated ? "Cost est. " : "Cost "}</span>
            <span className="font-medium">{money.length ? money.join(" · ") : "not metered"}</span>
            <span className="text-muted-foreground"> · {cost?.label}</span>
          </span>
          <span className="font-medium">
            {result.source === "mock" ? "Mock" : result.provider} · {result.model}
            {result.source === "mock" ? " (not called)" : ""} · {effortLabel(result.effort)}
          </span>
        </>
      ) : (
        <span className="text-muted-foreground">Extract to fill TTFT, tokens, and cost.</span>
      )}
      {result?.timingsNote ? (
        <span className="basis-full text-muted-foreground">{result.timingsNote}</span>
      ) : null}
      {cost ? <span className="basis-full text-muted-foreground">{cost.assumption}</span> : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-muted-foreground">{label} </span>
      <span className="font-medium tabular-nums">{value}</span>
    </span>
  );
}
