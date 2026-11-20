import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MAX_IMAGE_BYTES, MAX_IMAGES } from "../shared/copy.ts";
import { getFixture, FIXTURES } from "../shared/fixtures.ts";
import type { Effort } from "../shared/schema.ts";
import type { ExtractResult, ModePayload, ProviderId } from "../shared/types.ts";
import { MetricsStrip } from "./desk/MetricsStrip.tsx";
import { PhotoStage } from "./desk/PhotoStage.tsx";
import { TaskBoard, sourceFor, type ActiveItem } from "./desk/TaskBoard.tsx";
import { ThreadPane } from "./desk/ThreadPane.tsx";
import { extractBoard, fetchMode } from "./lib/api.ts";
import { blobToDataUrl, type DeskImage } from "./lib/images.ts";
import { effortLabel } from "./lib/labels.ts";

const ACCEPT = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export default function App() {
  const [mode, setMode] = useState<ModePayload | null>(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState<DeskImage[]>([]);
  const [fixtureId, setFixtureId] = useState<string | null>(null);
  const [heroId, setHeroId] = useState<string | null>(null);
  const [effort, setEffort] = useState<Effort>("no_think");
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [active, setActive] = useState<ActiveItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    fetchMode()
      .then((payload) => {
        setMode(payload);
        setProvider(payload.provider);
      })
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : "Mode check failed.";
        setError(message);
      });
  }, []);

  async function loadFixture(id: string) {
    const fixture = getFixture(id);
    if (!fixture) return;
    try {
      const loaded: DeskImage[] = [];
      for (const image of fixture.images) {
        const response = await fetch(image.src);
        if (!response.ok) throw new Error(`Missing sample image ${image.name}`);
        loaded.push({ id: image.id, name: image.name, dataUrl: await blobToDataUrl(await response.blob()) });
      }
      setImages(loaded);
      setText(fixture.text);
      setFixtureId(fixture.id);
      setHeroId(loaded[0]?.id ?? null);
      setResult(null);
      setActive(null);
      setError(null);
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : "Could not load the sample.");
    }
  }

  async function addFiles(files: FileList) {
    const next = [...images];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_IMAGES) {
        toast.error("Six photos max.");
        break;
      }
      if (!ACCEPT.has(file.type)) {
        toast.error(`${file.name} must be PNG, JPEG, WEBP, or GIF.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name} is over 10 MB.`);
        continue;
      }
      next.push({ id: `upload-${crypto.randomUUID()}`, name: file.name, dataUrl: await blobToDataUrl(file) });
    }
    setImages(next);
    setFixtureId(null);
    setHeroId((current) => current ?? next[0]?.id ?? null);
  }

  function removeImage(id: string) {
    const next = images.filter((image) => image.id !== id);
    setImages(next);
    setFixtureId(null);
    setHeroId((current) => (current === id ? next[0]?.id ?? null : current));
  }

  async function onExtract() {
    setPending(true);
    setError(null);
    const fixture = fixtureId ? getFixture(fixtureId) : undefined;
    const exact =
      fixture !== undefined &&
      fixture.text === text &&
      fixture.images.length === images.length &&
      fixture.images.every((image, index) => images[index]?.id === image.id && images[index]?.name === image.name);
    try {
      const extracted = await extractBoard({
        text,
        images,
        fixtureId: exact ? fixture.id : null,
        effort,
        provider: mode?.mode === "live" ? provider : null,
      });
      setResult(extracted);
      setActive(null);
      setRunId((value) => value + 1);
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : "Extract failed.";
      setResult(null);
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  const source = sourceFor(result, active);
  const liveProviders = mode?.providers.filter((item) => item.configured) ?? [];
  const resolvedHero =
    source?.type === "image" && source.imageId && images.some((image) => image.id === source.imageId)
      ? source.imageId
      : heroId;

  return (
    <main className="mx-auto flex h-dvh max-w-[1440px] flex-col gap-2 px-3 py-2">
      <header className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Hy4 flash · Tencent Hy</p>
          <h1 className="text-lg leading-tight font-semibold">Whiteboard to tasks</h1>
        </div>
        <Badge variant={mode?.mode === "live" ? "default" : "secondary"} data-testid="mock-badge">
          {mode?.banner ?? "Checking mode…"}
        </Badge>
        {FIXTURES.map((fixture) => (
          <Button
            key={fixture.id}
            type="button"
            size="sm"
            variant={fixtureId === fixture.id ? "default" : "outline"}
            data-testid={`fixture-${fixture.id}`}
            onClick={() => void loadFixture(fixture.id)}
          >
            {fixture.label}
          </Button>
        ))}
        <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="Reasoning effort">
          <EffortButton current={effort} value="no_think" onSelect={setEffort} />
          <EffortButton current={effort} value="high" onSelect={setEffort} />
        </div>
        {mode?.mode === "live" && liveProviders.length > 0 ? (
          <label className="flex items-center gap-1 text-xs">
            Provider
            <select
              className="rounded-md border bg-background px-1.5 py-1"
              aria-label="Provider"
              value={provider ?? liveProviders[0]?.id ?? ""}
              onChange={(event) => setProvider(event.target.value as ProviderId)}
            >
              {liveProviders.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · {item.model}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button type="button" data-testid="extract" disabled={pending} onClick={() => void onExtract()}>
          {pending ? "Extracting…" : "Extract tasks"}
        </Button>
      </header>
      <p className="text-xs text-muted-foreground" data-testid="mode-detail">
        {mode?.detail ?? "Starting the local API…"}
      </p>
      <MetricsStrip result={result} />
      <PhotoStage
        images={images}
        heroId={resolvedHero}
        source={source}
        onHero={setHeroId}
        onRemove={removeImage}
        onAdd={(files) => void addFiles(files)}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <ThreadPane text={text} source={source} onText={setText} />
        <TaskBoard key={runId} result={result} error={error} active={active} onActive={setActive} />
      </div>
    </main>
  );
}

function EffortButton({
  current,
  value,
  onSelect,
}: {
  current: Effort;
  value: Effort;
  onSelect: (effort: Effort) => void;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      className={`rounded-md px-2 py-1 text-xs ${selected ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}
      aria-pressed={selected}
      data-testid={`effort-${value}`}
      onClick={() => onSelect(value)}
    >
      {effortLabel(value)}
    </button>
  );
}
