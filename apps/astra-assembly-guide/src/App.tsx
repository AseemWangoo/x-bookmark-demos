import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  PHOTO_MOCK_MESSAGE,
  SERVICE_TIERS,
  ULTRAFAST_LIST_NOTE,
  ULTRAFAST_PROMO_LABEL,
  modelLabel,
  tierLabel,
  type ModelKey,
  type ServiceTier,
} from "../shared/copy.ts";
import { KITS } from "../shared/fixtures/kits.ts";
import { formatUsd } from "../shared/format.ts";
import type { AssembleResult, ModePayload } from "../shared/result.ts";
import { ModelPane } from "./desk/ModelPane.tsx";
import { assemble, fetchMode } from "./lib/api.ts";
import { prepareImage } from "./lib/image.ts";

export default function App() {
  const [mode, setMode] = useState<ModePayload | null>(null);
  const [text, setText] = useState("");
  const [fixtureId, setFixtureId] = useState<string | undefined>(undefined);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [tier, setTier] = useState<ServiceTier>("default");
  const [results, setResults] = useState<Partial<Record<ModelKey, AssembleResult>>>({});
  const [selected, setSelected] = useState<Partial<Record<ModelKey, string | null>>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetchMode()
      .then(setMode)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Mode check failed.");
      });
  }, []);

  async function onSubmit(models: ModelKey[]) {
    setPending(true);
    setError(null);
    try {
      const response = await assemble({
        sourceText: text,
        imageDataUrl: imageDataUrl ?? undefined,
        fixtureId,
        models,
        serviceTier: tier,
      });
      setResults((current) => {
        const next = { ...current };
        for (const model of models) delete next[model];
        for (const result of response.results) next[result.modelKey] = result;
        return next;
      });
      setSelected((current) => {
        const next = { ...current };
        for (const result of response.results) {
          next[result.modelKey] = result.assembly.parts[0]?.id ?? null;
        }
        return next;
      });
      if (response.errors.length > 0) {
        const message = response.errors.map((entry) => `${modelLabel(entry.modelKey)}: ${entry.message}`).join(" ");
        setError(message);
        toast.error(message);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Assemble failed.";
      setError(message);
      if (message !== PHOTO_MOCK_MESSAGE) toast.error(message);
    } finally {
      setPending(false);
    }
  }

  const astra = results.astra;
  const sol = results.sol;
  const mock = mode?.mode !== "live";

  return (
    <>
      <a className="skip-link" href="#desk">
        Skip to the desk
      </a>
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Browser assembly desk</p>
            <h1 id="desk" tabIndex={-1} className="text-2xl font-semibold tracking-tight">
              Astra Assembly Guide
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Inspired by OpenAI&apos;s GPT-6.2 Astra RC-buggy demo. This page draws primitive meshes from structured
              JSON. It is not their CAD or Blender asset.
            </p>
          </div>
          <Badge variant={mock ? "secondary" : "default"} data-testid="mode-badge">
            {mode?.banner ?? "Checking mode"}
          </Badge>
        </div>
      </header>
      <section aria-label="Run mode" className="border-b bg-muted/40 px-4 py-3" data-testid="mode-banner">
        <div className="mx-auto max-w-[1400px]">
          <p className="text-sm text-muted-foreground">{mode?.detail}</p>
          <ol className="mt-2 list-decimal space-y-0.5 ps-5 font-mono text-xs text-muted-foreground">
            {(mode?.commands ?? []).map((command) => (
              <li key={command}>{command}</li>
            ))}
          </ol>
        </div>
      </section>
      <main className="mx-auto grid max-w-[1400px] gap-4 px-4 py-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <form
          className="flex flex-col gap-4"
          aria-labelledby="input-heading"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(["astra", "sol"]);
          }}
        >
          <h2 id="input-heading" className="text-base font-medium">
            Parts list
          </h2>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Hand-authored fixtures. Loading one fills the list. It is not model output.</p>
            <div className="flex flex-wrap gap-2">
              {KITS.map((kit) => (
                <Button
                  key={kit.id}
                  type="button"
                  variant={fixtureId === kit.id ? "default" : "outline"}
                  className="min-h-12"
                  data-testid={`fixture-${kit.id}`}
                  onClick={() => {
                    setText(kit.sourceText);
                    setFixtureId(kit.id);
                    setImageDataUrl(null);
                    setError(null);
                  }}
                >
                  {kit.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="parts" className="text-sm font-medium">
              Parts list or build steps
            </label>
            <Textarea
              id="parts"
              name="parts"
              data-testid="parts-input"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setFixtureId(undefined);
              }}
              className="min-h-40 text-base"
              spellCheck
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="photo" className="text-sm font-medium">
              Photo
            </label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="min-h-12 text-sm file:me-3 file:min-h-12 file:rounded-md file:border file:bg-background file:px-3"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void prepareImage(file)
                  .then((dataUrl) => {
                    setImageDataUrl(dataUrl);
                    setError(null);
                  })
                  .catch((cause: unknown) => {
                    const message = cause instanceof Error ? cause.message : "Could not read that photo.";
                    setError(message);
                    toast.error(message);
                  });
              }}
            />
            <p className="text-xs text-muted-foreground">
              PNG, JPEG, or WebP. The browser caps the long side at 2048 px before upload.
              {mock
                ? " Mock mode keeps the preview and will not invent an assembly."
                : " Live mode sends the data URL to the server. The API key stays there."}
            </p>
            {imageDataUrl ? (
              <figure className="flex flex-col gap-2">
                <img src={imageDataUrl} alt="Uploaded photo preview" className="max-h-36 rounded-md border object-contain" />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 w-fit"
                  onClick={() => setImageDataUrl(null)}
                >
                  Remove photo
                </Button>
              </figure>
            ) : null}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Service tier</legend>
            <div className="flex flex-col gap-2">
              {SERVICE_TIERS.map((value) => (
                <label key={value} className="flex min-h-12 items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="serviceTier"
                    value={value}
                    data-testid={`tier-${value}`}
                    checked={tier === value}
                    onChange={() => setTier(value)}
                    className="size-4 accent-stone-900"
                  />
                  <span>
                    {tierLabel(value)}{" "}
                    <span className="font-mono text-xs text-muted-foreground">service_tier {value}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Standard is the default. The same tier is sent for every model in the run. Fast is not shown as priority.
            </p>
            {tier === "ultrafast" ? (
              <>
                <p className="text-xs">{ULTRAFAST_PROMO_LABEL}</p>
                <p className="text-xs text-muted-foreground">{ULTRAFAST_LIST_NOTE}</p>
              </>
            ) : null}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="min-h-12" data-testid="run-both" disabled={pending}>
              {pending ? "Running…" : "Run Astra and Sol"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-12"
              disabled={pending}
              onClick={() => void onSubmit(["astra"])}
            >
              Astra only
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-12"
              disabled={pending}
              onClick={() => void onSubmit(["sol"])}
            >
              Sol only
            </Button>
          </div>
          {error ? (
            <p role="alert" data-testid="run-error" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
              {error}
            </p>
          ) : null}
        </form>
        <section aria-label="Astra and Sol" className="grid gap-4 xl:grid-cols-2" aria-busy={pending}>
          <ModelPane
            result={astra}
            pending={pending}
            selectedId={selected.astra ?? null}
            onSelect={(id) => setSelected((current) => ({ ...current, astra: id }))}
          />
          <ModelPane
            result={sol}
            pending={pending}
            selectedId={selected.sol ?? null}
            onSelect={(id) => setSelected((current) => ({ ...current, sol: id }))}
          />
          {astra && sol ? <Delta astra={astra} sol={sol} /> : null}
        </section>
      </main>
    </>
  );
}

function Delta({ astra, sol }: { astra: AssembleResult; sol: AssembleResult }) {
  const costGap = round(astra.costUsd - sol.costUsd);
  const timeGap = astra.latencyMs - sol.latencyMs;
  const cheaper = costGap === 0 ? "the same cost" : costGap > 0 ? `${formatUsd(costGap)} less` : `${formatUsd(Math.abs(costGap))} more`;
  const slower = timeGap === 0 ? "the same latency" : timeGap > 0 ? `${timeGap} ms faster` : `${Math.abs(timeGap)} ms slower`;
  return (
    <p className="text-sm text-muted-foreground xl:col-span-2" data-testid="compare-delta">
      On this {astra.source === "mock" && sol.source === "mock" ? "recorded" : "run"}, Sol is {cheaper} than Astra and{" "}
      {slower}.
    </p>
  );
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
