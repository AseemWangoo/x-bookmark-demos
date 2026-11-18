import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SHORT_CONTEXT_NOTE,
  ULTRAFAST_LIST_NOTE,
  ULTRAFAST_PROMO_LABEL,
  modelLabel,
  tierLabel,
} from "../../shared/copy.ts";
import type { AssembleResult } from "../../shared/result.ts";
import { formatUsd } from "../../shared/format.ts";
import { cssColor } from "../../shared/schema.ts";
import { ExplodeCanvas } from "./ExplodeCanvas.tsx";

export function ModelPane({
  result,
  pending,
  selectedId,
  onSelect,
}: {
  result: AssembleResult | undefined;
  pending: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [explode, setExplode] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const runKey = result ? `${result.modelKey}:${result.latencyMs}:${result.assembly.title}` : "";

  useEffect(() => {
    if (!runKey || reduceMotion) {
      setPlaying(false);
      if (reduceMotion) setExplode(0.65);
      return;
    }
    setExplode(0);
    setPlaying(true);
  }, [runKey, reduceMotion]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 2400);
      setExplode(t);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const title = result ? modelLabel(result.modelKey) : "Model";
  const activeStep = result?.assembly.steps.find((step) => step.partIds.includes(selectedId ?? ""));

  return (
    <Card className="min-w-0 bg-card/95" data-testid={result ? `pane-${result.modelKey}` : undefined}>
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-lg">{title}</CardTitle>
          {result ? (
            <Badge variant={result.source === "mock" ? "secondary" : "default"} data-testid="source-badge">
              {result.source === "mock" ? "Recorded fixture" : "Live response"}
            </Badge>
          ) : null}
        </div>
        <p className="font-mono text-xs text-muted-foreground">{result?.model ?? "Waiting for a run"}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {result ? (
          <>
            <Metrics result={result} />
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13.5rem]">
              <div className="flex min-w-0 flex-col gap-2">
                <ExplodeCanvas
                  parts={result.assembly.parts}
                  explode={explode}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  label={`${title} exploded view of ${result.assembly.title}`}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11"
                    aria-label={playing ? "Pause explode" : "Play explode"}
                    aria-pressed={playing}
                    onClick={() => {
                      if (playing) {
                        setPlaying(false);
                        return;
                      }
                      setExplode(0);
                      setPlaying(true);
                    }}
                  >
                    {playing ? <Pause /> : <Play />}
                  </Button>
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
                    Explode
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(explode * 100)}
                      aria-valuetext={`${Math.round(explode * 100)} percent exploded`}
                      onChange={(event) => {
                        setPlaying(false);
                        setExplode(Number(event.target.value) / 100);
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Browser primitives only.{" "}
                  {result.source === "mock"
                    ? "This layout is hand-placed in the fixture, not model geometry."
                    : "Positions come from the model JSON, drawn here as meshes."}
                </p>
              </div>
              <Catalog parts={result.assembly.parts} selectedId={selectedId} onSelect={onSelect} />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium">{result.assembly.title}</h3>
              <p className="mb-2 text-sm text-muted-foreground">{result.assembly.summary}</p>
              <ol className="flex flex-col gap-1" aria-label="Assembly steps">
                {result.assembly.steps.map((step) => {
                  const current = activeStep?.n === step.n;
                  return (
                    <li key={step.n}>
                      <button
                        type="button"
                        className={`w-full rounded-md border px-2 py-1.5 text-left text-sm ${current ? "border-foreground bg-muted" : "border-transparent hover:bg-muted/70"}`}
                        aria-current={current ? "step" : undefined}
                        onClick={() => {
                          const id = step.partIds[0];
                          if (id) onSelect(id);
                        }}
                      >
                        <span className="font-medium">
                          {step.n}. {step.title}
                        </span>
                        <span className="mt-0.5 block text-muted-foreground">{step.instruction}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {pending ? "Running…" : "Run a kit to load this pane."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Metrics({ result }: { result: AssembleResult }) {
  const requested = `${tierLabel(result.requestedTier)} · ${result.requestedTier}`;
  const cells = [
    ["Requested", requested],
    ["Actual service_tier", result.actualTier],
    ["Latency", `${result.latencyMs} ms`],
    ["Input", String(result.usage.inputTokens)],
    ["Cached", String(result.usage.cachedTokens)],
    ["Writes 30m", String(result.usage.cacheWrite30mTokens)],
    ["Writes 12h", String(result.usage.cacheWrite12hTokens)],
    ["Output", String(result.usage.outputTokens)],
    ["Reasoning", `${result.usage.reasoningTokens} subset`],
    ["USD", `${formatUsd(result.costUsd)}${result.costEstimated ? " est." : ""}`],
  ];
  return (
    <div data-testid="metrics">
      <dl className="flex flex-wrap gap-1">
        {cells.map(([label, value]) => (
          <div key={label} className="rounded-md bg-muted px-1.5 py-1 whitespace-nowrap">
            <dt className="text-[0.65rem] text-muted-foreground">{label}</dt>
            <dd className="font-mono text-xs text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[0.7rem] leading-snug text-muted-foreground">{result.tierNote}</p>
      <p className="text-[0.7rem] leading-snug text-muted-foreground">{result.metricsNote}</p>
      {result.requestedTier === "ultrafast" && result.ultrafastPromo ? (
        <p className="text-[0.7rem] leading-snug text-foreground">{ULTRAFAST_PROMO_LABEL}</p>
      ) : null}
      {result.requestedTier === "ultrafast" ? (
        <p className="text-[0.7rem] leading-snug text-muted-foreground">{ULTRAFAST_LIST_NOTE}</p>
      ) : null}
      <p className="text-[0.7rem] leading-snug text-muted-foreground">{SHORT_CONTEXT_NOTE}</p>
    </div>
  );
}

function Catalog({
  parts,
  selectedId,
  onSelect,
}: {
  parts: AssembleResult["assembly"]["parts"];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex max-h-56 flex-col gap-1 overflow-auto" data-testid="catalog" aria-label="Parts catalog">
      {parts.map((part) => {
        const selected = part.id === selectedId;
        return (
          <li key={part.id}>
            <button
              type="button"
              data-testid={`part-${part.id}`}
              aria-pressed={selected}
              className={`flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-sm ${selected ? "border-foreground bg-muted" : "border-border hover:bg-muted/60"}`}
              onClick={() => onSelect(part.id)}
            >
              <span
                className="mt-0.5 size-4 shrink-0 rounded-sm border border-stone-400"
                style={{ background: cssColor(part.color) }}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block font-medium">
                  {part.name} <span className="font-normal text-muted-foreground">×{part.qty}</span>
                </span>
                <span className="block text-xs text-muted-foreground">{part.description}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return reduce;
}
