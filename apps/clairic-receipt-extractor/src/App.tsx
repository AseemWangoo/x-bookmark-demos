import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { extractDocument, fetchFixtures, fetchMode } from "@/lib/api";
import type { ExtractResponse, FieldSpec, Fixture } from "@/lib/types";
import { FieldBuilder } from "@/fields/FieldBuilder";
import { ComparePanel } from "@/results/ComparePanel";
import { FieldCard } from "@/results/FieldCard";
import { colorForIndex } from "@/source/colors";
import { SourcePanel } from "@/source/SourcePanel";
import { spansFromAnswers } from "@/source/segments";

const SNAKE = /^[a-z][a-z0-9_]*$/;

export default function App() {
  const [serverMode, setServerMode] = useState<"sample" | "live">("sample");
  const [forceSample, setForceSample] = useState(false);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixtureId, setFixtureId] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [fields, setFields] = useState<FieldSpec[]>([]);
  const [compare, setCompare] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [mode, loaded] = await Promise.all([fetchMode(), fetchFixtures()]);
        setServerMode(mode);
        setFixtures(loaded);
        const receipt = loaded.find((fixture) => fixture.id === "receipt-coffee") ?? loaded[0];
        if (receipt) {
          setFixtureId(receipt.id);
          setSource(receipt.source);
          setFields(receipt.presetFields);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load fixtures");
      }
    })();
  }, []);

  const useSample = serverMode === "sample" || forceSample;
  const colorForField = useMemo(() => {
    const map = new Map(fields.map((field, index) => [field.name, colorForIndex(index)]));
    return (name: string) => map.get(name) ?? colorForIndex(0);
  }, [fields]);

  const spans = useMemo(
    () => (result ? spansFromAnswers(result.clairic.answers) : []),
    [result],
  );

  const runExtract = useCallback(
    async (nextCompare = compare) => {
      const problem = validate(source, fields);
      if (problem) {
        toast.error(problem);
        return;
      }
      setLoading(true);
      try {
        const response = await extractDocument({
          source,
          fields,
          compare: nextCompare,
          fixtureId: fixtureId ?? undefined,
          forceSample: useSample,
        });
        setResult(response);
        setEditing(false);
        setCompare(nextCompare);
        for (const error of response.errors ?? []) toast.error(error);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Extraction failed");
      } finally {
        setLoading(false);
      }
    },
    [compare, fields, fixtureId, source, useSample],
  );

  function pickFixture(fixture: Fixture) {
    setFixtureId(fixture.id);
    setSource(fixture.source);
    setFields(fixture.presetFields.map((field) => ({ ...field })));
    setResult(null);
    setActiveField(null);
    setEditing(false);
  }

  const illustrative = result?.clairic.synthetic === true || result?.llm?.synthetic === true;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <h1 className="text-base font-medium tracking-tight">Clairic receipt extractor</h1>
            <p className="text-xs text-muted-foreground">
              Typed fields, confidence, and the span they came from.
            </p>
          </div>
          <Badge data-testid="mode-badge" variant={useSample ? "secondary" : "default"}>
            {useSample ? "Sample" : "Live"}
          </Badge>
          {useSample || illustrative ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" data-testid="illustrative">
                  illustrative
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Sample answers are hand-written to Clairic&apos;s documented response shape.
              </TooltipContent>
            </Tooltip>
          ) : null}
          {serverMode === "live" ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                size="sm"
                checked={forceSample}
                onCheckedChange={setForceSample}
                aria-label="Use sample recordings"
              />
              Use samples
            </label>
          ) : null}
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          Preview model: check confidence. Calibration can run narrow on unfamiliar data, and payee
          names in bank text are a known weak spot.{" "}
          <a
            className="underline"
            href="https://x.com/jlongster/status/2112725692517605868"
            target="_blank"
            rel="noreferrer"
          >
            Critique
          </a>
          {" · "}
          <a
            className="underline"
            href="https://blog.cloudflare.com/clairic-extraction-model/"
            target="_blank"
            rel="noreferrer"
          >
            Blog
          </a>
          {" · "}
          <a
            className="underline"
            href="https://developers.cloudflare.com/workers-ai/models/clairic/"
            target="_blank"
            rel="noreferrer"
          >
            Model docs
          </a>
        </p>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <SourcePanel
            fixtures={fixtures}
            fixtureId={fixtureId}
            source={source}
            editing={editing}
            spans={spans}
            colorForField={colorForField}
            activeField={activeField}
            onActiveField={setActiveField}
            onPickFixture={pickFixture}
            onSource={(next) => {
              setSource(next);
              setFixtureId(null);
              setResult(null);
            }}
            onEditing={setEditing}
          />
          <div className="flex flex-col gap-4">
            <FieldBuilder
              fields={fields}
              canReset={fixtureId !== null}
              onChange={(next) => {
                setFields(next);
                setResult(null);
              }}
              onReset={() => {
                const fixture = fixtures.find((item) => item.id === fixtureId);
                if (fixture) setFields(fixture.presetFields.map((field) => ({ ...field })));
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                data-testid="extract"
                disabled={loading || source.length === 0}
                onClick={() => void runExtract(compare)}
              >
                {loading ? "Extracting…" : "Extract"}
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={compare}
                  data-testid="compare-switch"
                  aria-label="Compare with LLM"
                  onCheckedChange={(checked) => {
                    setCompare(checked);
                    if (checked && result) void runExtract(true);
                  }}
                />
                Compare with LLM
              </label>
            </div>
          </div>
        </div>
        {result ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-medium">Clairic</h2>
              <p className="text-xs text-muted-foreground">
                {result.clairic.latencyMs} ms
                {result.clairic.truncated ? " · truncated" : ""}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {fields.map((field) => {
                const answer = result.clairic.answers[field.name];
                if (!answer) return null;
                return (
                  <FieldCard
                    key={field.name}
                    field={field}
                    result={answer}
                    color={colorForField(field.name)}
                    active={activeField === field.name}
                    origin="clairic"
                    onActive={setActiveField}
                  />
                );
              })}
            </div>
          </section>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Pick a fixture or paste a document, then extract. Sample mode replays recorded answers
            and does not call Cloudflare.
          </div>
        )}
        {compare && result?.llm ? (
          <ComparePanel fields={fields} clairic={result.clairic} llm={result.llm} />
        ) : null}
      </main>
    </div>
  );
}

function validate(source: string, fields: FieldSpec[]): string | null {
  if (source.length === 0) return "Source is empty";
  if (source.length > 100_000) return "Source is too long";
  if (fields.length === 0) return "Add at least one field";
  const names = new Set<string>();
  for (const field of fields) {
    if (!SNAKE.test(field.name)) return `Use snake_case for ${field.name || "a new field"}`;
    if (names.has(field.name)) return `Duplicate field ${field.name}`;
    if (field.type === "list" && !field.items) return `${field.name} needs an item type`;
    names.add(field.name);
  }
  return null;
}
