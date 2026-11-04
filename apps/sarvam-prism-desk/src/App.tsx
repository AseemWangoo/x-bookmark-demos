import { Switch } from "@/components/ui/switch";
import { Composer } from "@/desk/Composer";
import { LanguageStrip } from "@/desk/LanguageStrip";
import { PresetChips } from "@/desk/PresetChips";
import { ModeBadge } from "@/info/ModeBadge";
import { OpenWeightsCard } from "@/info/OpenWeightsCard";
import { RawSheet } from "@/info/RawSheet";
import { matchPreset } from "@/lib/match";
import { useDebouncedRoute } from "@/lib/useDebouncedRoute";
import { RoutingCard } from "@/routing/RoutingCard";
import { LatencyMeter } from "@/speed/LatencyMeter";
import { presetById } from "../fixtures/presets";

export default function App() {
  const desk = useDebouncedRoute();
  const match = matchPreset(desk.text);
  const mockLocked = desk.modeInfo.mode === "mock";
  const showingMock = mockLocked || desk.forceMock;
  const stripDisabled = !match && showingMock;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <h1 className="text-sm font-medium">Sarvam Prism Desk</h1>
        <ModeBadge mode={showingMock ? "mock" : "live"} model={desk.modeInfo.model} />
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Force mock
            <Switch
              size="sm"
              checked={showingMock}
              disabled={mockLocked}
              onCheckedChange={desk.onForceMock}
              aria-label="Force mock"
            />
          </label>
          <RawSheet raw={desk.route?.raw ?? null} />
        </div>
      </header>
      {showingMock ? (
        <div
          data-testid="mock-banner"
          className="shrink-0 bg-amber-100 px-3 py-1 text-xs text-amber-950"
        >
          No API calls are made. Probabilities and latencies are synthetic.
        </div>
      ) : null}
      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-3 p-3">
        <section className="flex min-h-0 flex-col gap-2">
          <PresetChips
            activeId={match?.id ?? null}
            onPick={(id) => {
              const preset = presetById(id);
              const lang = match?.lang ?? "en";
              if (preset) desk.routeNow(preset.variants[lang], lang);
            }}
          />
          <Composer value={desk.text} onChange={desk.onType} />
          <LanguageStrip
            active={match?.lang ?? null}
            disabled={stripDisabled}
            chips={desk.chips}
            onPick={(lang) => {
              void desk.applyLang(lang);
            }}
          />
          <RoutingCard
            route={desk.route}
            pending={desk.pending}
            threshold={desk.threshold}
            onThreshold={desk.setThreshold}
          />
        </section>
        <aside className="flex min-h-0 flex-col gap-2">
          <LatencyMeter
            serverMs={desk.route?.serverMs ?? null}
            e2eMs={desk.e2eMs}
            samples={desk.samples}
            synthetic={desk.route?.synthetic ?? showingMock}
          />
          <OpenWeightsCard />
        </aside>
      </main>
    </div>
  );
}
