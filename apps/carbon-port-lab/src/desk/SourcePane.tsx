import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  EFFORTS,
  effortLabel,
  isEffort,
  normalizeSource,
  type Effort,
  type FixtureSummary,
} from "../../shared/port.ts";

type SourcePaneProps = {
  fixtures: FixtureSummary[];
  source: string;
  effort: Effort;
  pending: boolean;
  onSource: (source: string) => void;
  onPick: (fixture: FixtureSummary) => void;
  onEffort: (effort: Effort) => void;
  onPort: () => void;
};

export function SourcePane({
  fixtures,
  source,
  effort,
  pending,
  onSource,
  onPick,
  onEffort,
  onPort,
}: SourcePaneProps) {
  return (
    <section className="flex min-h-0 flex-col gap-3 p-4" aria-label="Legacy source">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">Legacy snippet</h2>
        <p className="text-xs text-muted-foreground">Paste or pick a recorded fixture</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {fixtures.map((fixture) => {
          const selected = normalizeSource(fixture.source) === normalizeSource(source);
          return (
            <Button
              key={fixture.id}
              type="button"
              size="sm"
              variant={selected ? "default" : "outline"}
              aria-pressed={selected}
              onClick={() => onPick(fixture)}
            >
              {fixture.title}
            </Button>
          );
        })}
      </div>
      <Textarea
        value={source}
        onChange={(event) => onSource(event.target.value)}
        spellCheck={false}
        aria-label="Legacy source"
        className="min-h-72 flex-1 resize-y font-mono text-xs leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          aria-label="Thinking effort"
          spacing={0}
          variant="outline"
          size="sm"
          value={[effort]}
          onValueChange={(values) => {
            const next = values[0];
            if (next && isEffort(next)) onEffort(next);
          }}
        >
          {EFFORTS.map((level) => (
            <ToggleGroupItem
              key={level}
              value={level}
              aria-label={effortLabel(level)}
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {effortLabel(level)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button type="button" onClick={onPort} disabled={pending || source.trim().length === 0}>
          {pending ? "Porting…" : "Port"}
        </Button>
        <p className="text-xs text-muted-foreground">Default is Medium. Port always re-runs.</p>
      </div>
    </section>
  );
}
