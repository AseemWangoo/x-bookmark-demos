import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DuelPane } from "@/desk/DuelPane";
import { ModeBanner } from "@/desk/ModeBanner";
import { PromptBar, type SketchFile } from "@/desk/PromptBar";
import { fetchMode, streamDuel } from "@/lib/api";
import {
  EFFORT_ORDER,
  type DuelEvent,
  type EffortName,
  type ModePayload,
  type PaneStatus,
} from "../shared/duel.ts";

const IDLE: PaneStatus = { status: "idle" };

export default function App() {
  const [mode, setMode] = useState<ModePayload | null>(null);
  const [prompt, setPrompt] = useState("pricing page for an AI API");
  const [sketch, setSketch] = useState<SketchFile | null>(null);
  const [running, setRunning] = useState(false);
  const [panes, setPanes] = useState<Record<EffortName, PaneStatus>>({
    low: IDLE,
    high: IDLE,
  });

  useEffect(() => {
    const controller = new AbortController();
    void fetchMode(controller.signal)
      .then(setMode)
      .catch(() => {
        if (!controller.signal.aborted) setMode(null);
      });
    return () => controller.abort();
  }, []);

  async function generate(): Promise<void> {
    const brief = prompt.trim();
    if (!brief || running) return;
    setRunning(true);
    setPanes({ low: { status: "pending" }, high: { status: "pending" } });
    try {
      await streamDuel(
        { prompt: brief, imageDataUrl: sketch?.dataUrl },
        (event) => {
          applyEvent(event, setPanes);
          if (event.type === "error") toast.error(event.message);
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Duel failed.";
      toast.error(message);
      setPanes({
        low: { status: "error", message },
        high: { status: "error", message },
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-baseline justify-between gap-4 border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-medium tracking-tight">Inkling Design Duel</h1>
          <p className="text-sm text-muted-foreground">
            Same brief, Inkling 2 Small at effort 0.2 and 0.9.
          </p>
        </div>
      </header>
      <ModeBanner mode={mode} />
      <PromptBar
        prompt={prompt}
        sketch={sketch}
        running={running}
        onPrompt={setPrompt}
        onSketch={setSketch}
        onSubmit={() => {
          void generate();
        }}
      />
      <main className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-2">
        {EFFORT_ORDER.map((effort) => (
          <DuelPane key={effort} effort={effort} pane={panes[effort]} />
        ))}
      </main>
    </div>
  );
}

function applyEvent(
  event: DuelEvent,
  setPanes: (update: (current: Record<EffortName, PaneStatus>) => Record<EffortName, PaneStatus>) => void,
): void {
  switch (event.type) {
    case "meta":
    case "done":
      return;
    case "status":
      setPanes((current) => ({ ...current, [event.effort]: { status: "pending" } }));
      return;
    case "result":
      setPanes((current) => ({ ...current, [event.effort]: { status: "done", result: event.result } }));
      return;
    case "error":
      setPanes((current) => ({ ...current, [event.effort]: { status: "error", message: event.message } }));
      return;
    default: {
      const unreachable: never = event;
      throw new Error(`Unknown duel event: ${JSON.stringify(unreachable)}`);
    }
  }
}
