import type { InboxMessage, TriageBatch, TriageRow } from "@/lib/types";
import { answersAgree } from "@/lib/agreement";
import { formatMs, formatRatio, formatTokens, formatUsd } from "@/lib/format";
import { speedupRatio } from "@/lib/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Bar({ label, ms, max }: { label: string; ms: number; max: number }) {
  const width = max <= 0 ? 0 : Math.max(4, (ms / max) * 100);
  return (
    <div className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-2 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-foreground transition-all duration-700" style={{ width: `${width}%` }} />
      </div>
      <span className="text-right tabular-nums">{formatMs(ms)}</span>
    </div>
  );
}

export function ComparePanel({
  messages,
  decisions,
  responses,
}: {
  messages: InboxMessage[];
  decisions: TriageBatch;
  responses: TriageBatch;
}) {
  const max = Math.max(
    1,
    ...decisions.rows.map((row) => row.latencyMs),
    ...responses.rows.map((row) => row.latencyMs),
  );
  const speedup = speedupRatio(responses.batchMs, decisions.batchMs);
  const decisionById = new Map(decisions.rows.map((row) => [row.id, row]));
  const responseById = new Map(responses.rows.map((row) => [row.id, row]));
  const comparable = messages.filter((message) => decisionById.has(message.id) && responseById.has(message.id));
  const agreed = comparable.filter((message) => {
    const left = decisionById.get(message.id) as TriageRow;
    const right = responseById.get(message.id) as TriageRow;
    return answersAgree(left.answers, right.answers);
  }).length;
  const illustrative = Boolean(decisions.synthetic || responses.synthetic);

  return (
    <Card data-testid="compare-panel">
      <CardHeader>
        <CardTitle>Compare with Responses API</CardTitle>
        <p className="text-xs text-muted-foreground">
          {illustrative
            ? "Illustrative timings. OpenAI claims up to 10× versus GPT-6 Luna on the Responses API. These numbers are not a measurement."
            : "OpenAI claims up to 10×. These are your measured numbers."}{" "}
          Reasoning effort: {responses.reasoningEffort ?? "none"}. The Responses API does not return probabilities.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Decisions batch" value={formatMs(decisions.batchMs)} />
          <Metric label="Responses batch" value={formatMs(responses.batchMs)} />
          <Metric label="Speedup" value={formatRatio(speedup)} hint="Responses ÷ Decisions" />
          <Metric label="Agreement" value={`${agreed}/${comparable.length}`} hint="urgent, route, rounded priority" />
          <Metric label="Decisions input" value={formatTokens(decisions.usage.input_tokens)} hint="output is not billed" />
          <Metric
            label="Responses tokens"
            value={formatTokens(responses.usage.input_tokens + responses.usage.output_tokens)}
            hint={`${formatTokens(responses.usage.output_tokens_details.reasoning_tokens)} reasoning, inside output`}
          />
          <Metric label="Decisions cost" value={formatUsd(decisions.costUsd)} hint="estimated" />
          <Metric label="Responses cost" value={formatUsd(responses.costUsd)} hint="estimated" />
        </div>
        <div className="flex flex-col gap-3">
          {messages.map((message) => {
            const decision = decisionById.get(message.id);
            const response = responseById.get(message.id);
            if (!decision && !response) return null;
            return (
              <div key={message.id} className="grid gap-1 md:grid-cols-[14rem_1fr] md:items-center">
                <span className="truncate text-xs">{message.subject}</span>
                <div className="flex flex-col gap-1">
                  {decision ? <Bar label="Decisions" ms={decision.latencyMs} max={max} /> : null}
                  {response ? <Bar label="Responses" ms={response.latencyMs} max={max} /> : null}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="text-base font-medium tabular-nums">{value}</div>
      {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
