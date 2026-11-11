import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CanvasPane } from "@/desk/CanvasPane";
import { ModeBanner } from "@/desk/ModeBanner";
import { SourcePane } from "@/desk/SourcePane";
import { fetchFixtures, fetchMode, requestPort } from "@/lib/api";
import { normalizeSource, type Effort, type FixtureSummary, type ModePayload, type PortResult } from "../shared/port.ts";

function cacheKey(source: string, effort: Effort): string {
  return `${normalizeSource(source)}\n${effort}`;
}

export default function App() {
  const [mode, setMode] = useState<ModePayload | null>(null);
  const [fixtures, setFixtures] = useState<FixtureSummary[]>([]);
  const [source, setSource] = useState("");
  const [language, setLanguage] = useState<string | undefined>("javascript");
  const [effort, setEffort] = useState<Effort>("medium");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PortResult | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const cache = useRef(new Map<string, PortResult>());
  const sourceRef = useRef(source);
  const effortRef = useRef(effort);
  sourceRef.current = source;
  effortRef.current = effort;

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([fetchMode(controller.signal), fetchFixtures(controller.signal)])
      .then(([nextMode, nextFixtures]) => {
        if (controller.signal.aborted) return;
        setMode(nextMode);
        setFixtures(nextFixtures);
        const first = nextFixtures[0];
        if (first && sourceRef.current.trim().length === 0) {
          setSource(first.source);
          setLanguage(first.language);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) toast.error("The port API is not reachable.");
      });
    return () => controller.abort();
  }, []);

  function showCached(nextSource: string, nextEffort: Effort): void {
    const cached = cache.current.get(cacheKey(nextSource, nextEffort)) ?? null;
    setResult(cached);
    setFromCache(cached !== null);
  }

  function onSource(next: string): void {
    setSource(next);
    const match = fixtures.find((fixture) => normalizeSource(fixture.source) === normalizeSource(next));
    setLanguage(match?.language);
    showCached(next, effortRef.current);
  }

  function onPick(fixture: FixtureSummary): void {
    setSource(fixture.source);
    setLanguage(fixture.language);
    showCached(fixture.source, effortRef.current);
  }

  function onEffort(next: Effort): void {
    setEffort(next);
    showCached(sourceRef.current, next);
  }

  async function onPort(): Promise<void> {
    const snippet = source.trim();
    if (!snippet || pending) return;
    setPending(true);
    setFromCache(false);
    try {
      const next = await requestPort({
        source: snippet,
        language,
        effort,
      });
      cache.current.set(cacheKey(snippet, effort), next);
      setResult(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Port failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="flex items-baseline justify-between gap-3 px-4 py-3">
        <div>
          <h1 className="text-base font-medium tracking-tight">Carbon Port Lab</h1>
          <p className="text-xs text-muted-foreground">Legacy snippet to a sandboxed canvas app</p>
        </div>
      </header>
      <ModeBanner mode={mode} />
      <main className="grid min-h-0 flex-1 lg:grid-cols-2">
        <SourcePane
          fixtures={fixtures}
          source={source}
          effort={effort}
          pending={pending}
          onSource={onSource}
          onPick={onPick}
          onEffort={onEffort}
          onPort={() => {
            void onPort();
          }}
        />
        <CanvasPane result={result} pending={pending} fromCache={fromCache} />
      </main>
    </div>
  );
}
