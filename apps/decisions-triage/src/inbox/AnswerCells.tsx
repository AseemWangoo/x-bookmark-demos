import type { MouseEvent } from "react";
import type { NormalizedAnswers } from "@/lib/types";
import { formatPercent } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";

function stopRowClick(event: MouseEvent) {
  event.stopPropagation();
}

function Bars({
  items,
}: {
  items: { key: string; label: string; probability: number }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item) => (
        <div key={item.key} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2 text-xs">
          <span className="truncate">{item.label}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-foreground" style={{ width: `${Math.max(0, Math.min(100, item.probability * 100))}%` }} />
          </div>
          <span className="text-right text-muted-foreground tabular-nums">{formatPercent(item.probability)}</span>
        </div>
      ))}
    </div>
  );
}

export function UrgentCell({
  answers,
  threshold,
}: {
  answers: NormalizedAnswers;
  threshold: number;
}) {
  if (answers.urgent.refused) return <Badge variant="outline">Refused</Badge>;
  if (answers.urgent.unrecognised) return <Badge variant="outline">Unrecognised</Badge>;
  if (answers.urgent.probability === null && answers.urgent.value === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const probability = answers.urgent.probability;
  const flagged = probability !== null ? probability >= threshold : answers.urgent.value === true;
  return (
    <div className="flex items-center gap-2">
      {flagged ? <Badge>Urgent</Badge> : <Badge variant="outline">No</Badge>}
      <span className="tabular-nums">{probability === null ? "—" : formatPercent(probability)}</span>
    </div>
  );
}

export function RouteCell({ id, answers }: { id: string; answers: NormalizedAnswers }) {
  if (answers.route.refused) return <Badge variant="outline">Refused</Badge>;
  if (answers.route.unrecognised) return <Badge variant="outline">Unrecognised</Badge>;
  if (answers.route.choice === null) return <span className="text-muted-foreground">—</span>;
  const probabilities = answers.route.probabilities;
  const chip = (
    <Badge variant="secondary" className="capitalize">
      {String(answers.route.choice)}
      {answers.route.confidence !== null ? ` · ${formatPercent(answers.route.confidence)}` : ""}
    </Badge>
  );
  if (!probabilities) {
    return (
      <div className="flex flex-col items-start gap-1">
        {chip}
        <span className="text-[11px] text-muted-foreground">No probabilities</span>
      </div>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-auto px-0 hover:bg-transparent"
          data-testid={`route-${id}`}
          onClick={stopRowClick}
        >
          {chip}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80" onClick={stopRowClick}>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium">Route probabilities</p>
          <p className="text-[11px] text-muted-foreground">
            Confidence is shown as reported. It is not derived here.
          </p>
          <Bars
            items={probabilities.map((item) => ({
              key: String(item.value),
              label: String(item.value),
              probability: item.probability,
            }))}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PriorityCell({ id, answers }: { id: string; answers: NormalizedAnswers }) {
  if (answers.priority.refused) return <Badge variant="outline">Refused</Badge>;
  if (answers.priority.unrecognised) return <Badge variant="outline">Unrecognised</Badge>;
  if (answers.priority.score === null) return <span className="text-muted-foreground">—</span>;
  const score = answers.priority.score;
  const meter = (
    <div className="flex w-36 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium tabular-nums">{score.toFixed(1)}</span>
        <span className="truncate text-[11px] text-muted-foreground">{answers.priority.level}</span>
      </div>
      <Progress value={(score / 5) * 100} />
      {answers.priority.confidence !== null ? (
        <span className="text-[11px] text-muted-foreground tabular-nums">
          confidence {formatPercent(answers.priority.confidence)}
        </span>
      ) : null}
    </div>
  );
  if (!answers.priority.probabilities) return meter;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-auto px-0 hover:bg-transparent"
          data-testid={`priority-${id}`}
          onClick={stopRowClick}
        >
          {meter}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80" onClick={stopRowClick}>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium">Priority level probabilities</p>
          <p className="text-[11px] text-muted-foreground">
            The score is the probability-weighted level, shifted from the API’s 0–4 index to 1–5.
          </p>
          <Bars
            items={answers.priority.probabilities.map((item) => ({
              key: String(item.value),
              label: item.label,
              probability: item.probability,
            }))}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
