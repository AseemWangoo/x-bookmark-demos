import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatUsd, formatUsdPerMillion, formatValue, valuesAgree } from "@/lib/format";
import {
  CLAIRIC_INPUT_USD_PER_MILLION,
  CLAIRIC_PRICING_SOURCE,
  LLM_INPUT_USD_PER_MILLION,
  LLM_OUTPUT_USD_PER_MILLION,
  LLM_PRICING_SOURCE,
  costPerMillionDocuments,
} from "@/lib/pricing";
import { isUnrecorded, type FieldSpec, type ModelRun } from "@/lib/types";

type ComparePanelProps = {
  fields: FieldSpec[];
  clairic: ModelRun;
  llm: ModelRun;
};

export function ComparePanel({ fields, clairic, llm }: ComparePanelProps) {
  const maxLatency = Math.max(clairic.latencyMs, llm.latencyMs, 1);

  return (
    <section data-testid="compare-panel" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-medium">Compare</h2>
        <p className="max-w-xl text-xs text-muted-foreground">
          Estimated. Clairic is input tokens × ${CLAIRIC_INPUT_USD_PER_MILLION.toFixed(2)}/M.{" "}
          {llm.model} is ${LLM_INPUT_USD_PER_MILLION}/M input and ${LLM_OUTPUT_USD_PER_MILLION}/M
          output.{" "}
          <a className="underline" href={CLAIRIC_PRICING_SOURCE} target="_blank" rel="noreferrer">
            Clairic pricing
          </a>
          {" · "}
          <a className="underline" href={LLM_PRICING_SOURCE} target="_blank" rel="noreferrer">
            Workers AI pricing
          </a>
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <RunMetric title="Clairic" run={clairic} maxLatency={maxLatency} tokens={clairicTokens(clairic)} />
        <RunMetric title="LLM" run={llm} maxLatency={maxLatency} tokens={llmTokens(llm)} />
      </div>
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium">Clairic</th>
              <th className="px-3 py-2 font-medium">LLM</th>
              <th className="px-3 py-2 font-medium">Agreement</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => {
              const left = clairic.answers[field.name];
              const right = llm.answers[field.name];
              const leftValue = left && !isUnrecorded(left) ? left.value : undefined;
              const rightValue = right && !isUnrecorded(right) ? right.value : undefined;
              const comparable = left && right && !isUnrecorded(left) && !isUnrecorded(right);
              const agree = comparable && valuesAgree(leftValue, rightValue);
              return (
                <tr key={field.name} className="border-t align-top">
                  <td className="px-3 py-2 font-mono text-xs">{field.name}</td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-pre-wrap">
                    {left && isUnrecorded(left) ? left.message : formatValue(leftValue)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-pre-wrap">
                    {right && isUnrecorded(right) ? right.message : formatValue(rightValue)}
                  </td>
                  <td className="px-3 py-2">
                    {comparable ? (
                      <Badge variant={agree ? "secondary" : "destructive"} data-testid="agreement">
                        {agree ? "match" : "mismatch"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RunMetric({
  title,
  run,
  maxLatency,
  tokens,
}: {
  title: string;
  run: ModelRun;
  maxLatency: number;
  tokens: string;
}) {
  const perCall = run.costUsd;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          {run.synthetic ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" data-testid="illustrative">
                  illustrative
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Hand-written to the documented response shape. Not a live model call.
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <p className="truncate font-mono text-[11px] text-muted-foreground">{run.model}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Latency</span>
            <span className="tabular-nums text-foreground">{run.latencyMs} ms</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary"
              style={{ width: `${(run.latencyMs / maxLatency) * 100}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{tokens}</p>
        <p className="text-xs">
          <span className="text-muted-foreground">Per call </span>
          <span className="font-medium tabular-nums">{perCall === null ? "—" : formatUsd(perCall)}</span>
          <span className="text-muted-foreground"> · per 1M docs </span>
          <span className="font-medium tabular-nums">
            {perCall === null ? "—" : formatUsdPerMillion(costPerMillionDocuments(perCall))}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

function clairicTokens(run: ModelRun): string {
  if (!run.usage) return "No token usage";
  const output = run.usage.output_tokens;
  const passes = "passes" in run.usage ? ` · ${run.usage.passes} passes` : "";
  return `${run.usage.input_tokens} input tokens · ${output} output${passes}`;
}

function llmTokens(run: ModelRun): string {
  if (!run.usage) return "No token usage";
  return `${run.usage.input_tokens} input tokens · ${run.usage.output_tokens} output tokens`;
}
