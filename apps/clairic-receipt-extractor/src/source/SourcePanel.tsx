import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Fixture } from "@/lib/types";
import { HighlightedText } from "./HighlightedText.tsx";
import type { SpanMark } from "./segments.ts";

type SourcePanelProps = {
  fixtures: Fixture[];
  fixtureId: string | null;
  source: string;
  editing: boolean;
  spans: SpanMark[];
  colorForField: (field: string) => string;
  activeField: string | null;
  onActiveField: (field: string | null) => void;
  onPickFixture: (fixture: Fixture) => void;
  onSource: (source: string) => void;
  onEditing: (editing: boolean) => void;
};

export function SourcePanel({
  fixtures,
  fixtureId,
  source,
  editing,
  spans,
  colorForField,
  activeField,
  onActiveField,
  onPickFixture,
  onSource,
  onEditing,
}: SourcePanelProps) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">Source</h2>
        <span className="text-xs text-muted-foreground">txt, eml, or md</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {fixtures.map((fixture) => (
          <Button
            key={fixture.id}
            type="button"
            size="sm"
            variant={fixture.id === fixtureId ? "default" : "outline"}
            data-testid={`fixture-${fixture.id}`}
            onClick={() => onPickFixture(fixture)}
          >
            {fixture.title}
          </Button>
        ))}
      </div>
      {fixtureId ? (
        <p className="text-xs text-muted-foreground">
          {fixtures.find((fixture) => fixture.id === fixtureId)?.blurb}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Custom text. Sample mode only replays fixtures.</p>
      )}
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" asChild>
          <label>
            Upload
            <input
              data-testid="upload"
              className="sr-only"
              type="file"
              accept=".txt,.eml,.md,text/plain,message/rfc822"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void file.text().then((text) => {
                  onSource(text);
                  onEditing(true);
                });
              }}
            />
          </label>
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onEditing(!editing)}>
          {editing ? "Show highlights" : "Edit source"}
        </Button>
      </div>
      {editing ? (
        <Textarea
          data-testid="source-input"
          value={source}
          onChange={(event) => onSource(event.target.value)}
          rows={14}
          spellCheck={false}
          className="min-h-64 font-mono text-[13px] leading-6"
          placeholder="Paste a receipt, invoice, or email"
        />
      ) : (
        <HighlightedText
          source={source}
          spans={spans}
          colorForField={colorForField}
          activeField={activeField}
          onActiveField={onActiveField}
        />
      )}
    </section>
  );
}
