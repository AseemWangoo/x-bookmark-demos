import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IFRAME_SANDBOX,
  effortValue,
  formatUsd,
  type EffortName,
  type PaneStatus,
} from "../../shared/duel.ts";

export function DuelPane({ effort, pane }: { effort: EffortName; pane: PaneStatus }) {
  const value = effortValue(effort);
  const title = effort === "low" ? "Low effort" : "High effort";
  return (
    <Card className="h-full min-h-0 gap-3" data-testid={`pane-${effort}`} data-effort={effort}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">
            {title} · {value}
          </CardTitle>
          <PaneBadge pane={pane} />
        </div>
        <Metrics effort={effort} pane={pane} />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <PaneBody effort={effort} pane={pane} value={value} />
      </CardContent>
    </Card>
  );
}

function PaneBadge({ pane }: { pane: PaneStatus }) {
  switch (pane.status) {
    case "idle":
      return <Badge variant="outline">Waiting</Badge>;
    case "pending":
      return <Badge variant="outline">Generating</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    case "done":
      return (
        <Badge variant={pane.result.source === "mock" ? "secondary" : "default"} data-testid="output-badge">
          {pane.result.source === "mock" ? "Recorded output" : liveLabel(pane.result.transport)}
        </Badge>
      );
    default: {
      const unreachable: never = pane;
      return unreachable;
    }
  }
}

function liveLabel(transport: "openai" | "anthropic" | undefined): string {
  switch (transport) {
    case "anthropic":
      return "Live · Anthropic fallback";
    case "openai":
      return "Live · OpenAI-compatible";
    case undefined:
      return "Live Tinker";
    default: {
      const unreachable: never = transport;
      return unreachable;
    }
  }
}

function Metrics({ effort, pane }: { effort: EffortName; pane: PaneStatus }) {
  if (pane.status !== "done") {
    return <p className="text-sm text-muted-foreground">Latency, tokens, and cost show up after this pane finishes.</p>;
  }
  const { usage, latencyMs, costUsd } = pane.result;
  const tokenLabel = usage.estimated ? "estimated" : pane.result.source === "mock" ? "recorded" : "usage";
  return (
    <dl className="grid grid-cols-3 gap-2 text-sm">
      <div>
        <dt className="text-muted-foreground">Latency</dt>
        <dd className="font-mono" data-testid={`metric-latency-${effort}`}>
          {latencyMs} ms
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Tokens</dt>
        <dd className="font-mono" data-testid={`metric-tokens-${effort}`}>
          {usage.promptTokens} in · {usage.completionTokens} out
          <span className="mt-0.5 block text-xs text-muted-foreground">{tokenLabel}</span>
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Cost</dt>
        <dd className="font-mono" data-testid={`metric-cost-${effort}`}>
          <Tooltip>
            <TooltipTrigger className="underline decoration-dotted underline-offset-2">
              {formatUsd(costUsd)}
            </TooltipTrigger>
            <TooltipContent>
              $0.30 / 1M input, $0.03 / 1M cached input, $1.00 / 1M output.
              {usage.cachedPromptTokens > 0 ? ` Cached input tokens: ${usage.cachedPromptTokens}.` : ""}
            </TooltipContent>
          </Tooltip>
        </dd>
      </div>
    </dl>
  );
}

function PaneBody({ effort, pane, value }: { effort: EffortName; pane: PaneStatus; value: number }) {
  switch (pane.status) {
    case "idle":
      return <p className="text-sm text-muted-foreground">Run a duel to render this side.</p>;
    case "pending":
      return (
        <p className="text-sm" data-testid={`pending-${effort}`}>
          Generating {effort} effort ({value})…
        </p>
      );
    case "error":
      return (
        <p className="text-sm text-destructive" data-testid={`error-${effort}`}>
          {pane.message}
        </p>
      );
    case "done":
      return (
        <Tabs defaultValue="preview" className="min-h-0 flex-1">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="min-h-0 flex-1 overflow-hidden">
            <iframe
              title={`${effort} effort preview`}
              sandbox={IFRAME_SANDBOX}
              srcDoc={pane.result.html}
              className="preview-frame rounded-lg ring-1 ring-foreground/10"
              data-testid={`preview-${effort}`}
            />
          </TabsContent>
          <TabsContent value="html">
            <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">{pane.result.html}</pre>
          </TabsContent>
          <TabsContent value="reasoning">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {pane.result.reasoning ?? "No reasoning trace on this response."}
            </p>
          </TabsContent>
        </Tabs>
      );
    default: {
      const unreachable: never = pane;
      return unreachable;
    }
  }
}
