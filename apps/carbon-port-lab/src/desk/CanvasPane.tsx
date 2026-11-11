import { Badge } from "@/components/ui/badge";
import {
  effortLabel,
  formatCount,
  formatUsd,
  INTRO_PRICING_LABEL,
  POST_INTRO_FOOTNOTE,
  REASONING_FOOTNOTE,
  type PortResult,
} from "../../shared/port.ts";

type CanvasPaneProps = {
  result: PortResult | null;
  pending: boolean;
  fromCache: boolean;
};

export function CanvasPane({ result, pending, fromCache }: CanvasPaneProps) {
  return (
    <section className="flex min-h-0 flex-col border-t border-border lg:border-t-0 lg:border-l" aria-label="Ported canvas">
      <header className="flex flex-col gap-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium">Canvas port</h2>
          {result ? (
            <>
              <Badge>{effortLabel(result.effort)}</Badge>
              <Badge variant="outline">
                {result.source === "mock" ? "Recorded output" : "Live output"}
              </Badge>
              {result.usage.estimated ? <Badge variant="secondary">Estimated tokens</Badge> : null}
            </>
          ) : null}
        </div>
        <Metrics result={result} pending={pending} />
        {fromCache && result ? (
          <p className="text-xs text-muted-foreground">
            Showing the previous {effortLabel(result.effort)} run for this snippet. Port runs it again.
          </p>
        ) : null}
        {result?.notes.length ? (
          <ul className="list-disc pl-4 text-xs text-muted-foreground">
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </header>
      <div className="relative min-h-[320px] flex-1 bg-black/20">
        {pending ? (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground">
            Porting… the iframe stays empty until a complete document arrives.
          </p>
        ) : null}
        {!pending && result ? (
          <iframe
            title={`${effortLabel(result.effort)} canvas port`}
            sandbox="allow-scripts"
            srcDoc={result.html}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full border-0 bg-white"
          />
        ) : null}
        {!pending && !result ? (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground">
            Pick a snippet and an effort, then Port. The sandboxed frame only loads a finished HTML document.
          </p>
        ) : null}
      </div>
      <footer className="space-y-1 px-4 py-3 text-xs text-muted-foreground">
        <p>{INTRO_PRICING_LABEL}. {POST_INTRO_FOOTNOTE}</p>
        <p>{REASONING_FOOTNOTE}</p>
      </footer>
    </section>
  );
}

function Metrics({ result, pending }: { result: PortResult | null; pending: boolean }) {
  if (pending) {
    return <p className="text-xs text-muted-foreground">Waiting for tokens, cost, and latency.</p>;
  }
  if (!result) {
    return (
      <p className="text-xs text-muted-foreground">
        Latency, input, cached input, output, reasoning, and USD show up here. {INTRO_PRICING_LABEL}.
      </p>
    );
  }
  const reasoning =
    result.usage.reasoningTokens === null ? "n/a" : formatCount(result.usage.reasoningTokens);
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
      <div>
        <dt className="inline text-muted-foreground">Latency </dt>
        <dd className="inline">{formatCount(result.latencyMs)} ms</dd>
      </div>
      <div>
        <dt className="inline text-muted-foreground">Input </dt>
        <dd className="inline">{formatCount(result.usage.inputTokens)}</dd>
      </div>
      <div>
        <dt className="inline text-muted-foreground">Cached </dt>
        <dd className="inline">{formatCount(result.usage.cachedInputTokens)}</dd>
      </div>
      <div>
        <dt className="inline text-muted-foreground">Output </dt>
        <dd className="inline">{formatCount(result.usage.outputTokens)}</dd>
      </div>
      <div>
        <dt className="inline text-muted-foreground">Reasoning </dt>
        <dd className="inline">{reasoning}</dd>
      </div>
      <div>
        <dt className="inline text-muted-foreground">Cost </dt>
        <dd className="inline">
          {formatUsd(result.costUsd)}{" "}
          <span className="text-muted-foreground">({INTRO_PRICING_LABEL})</span>
        </dd>
      </div>
    </dl>
  );
}
