import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodePanel } from "@/code/CodePanel";
import { TurnHistory } from "@/history/TurnHistory";
import { getExamples, getMode, streamTurn } from "@/lib/api";
import { streamingCodePreview } from "@/lib/streaming-code";
import type {
  Effort,
  ExampleScene,
  ModelChoice,
  RunMode,
  SceneError,
  TurnEvent,
  TurnKind,
  TurnRecord,
  TurnStatus,
} from "@/lib/types";
import { PromptBar } from "@/prompt/PromptBar";
import { guardCode } from "@/sandbox/guard";
import { ErrorCallout } from "@/scene/ErrorCallout";
import { SceneFrame } from "@/scene/SceneFrame";

type HistoryState = { turns: TurnRecord[]; cursor: number | null };
type LiveRun = { token: number; code: string };

function sceneIdFor(examples: ExampleScene[], kind: TurnKind, prompt: string, previous: string | null): string | null {
  const normalized = prompt.trim().toLowerCase();
  if (kind === "generate") {
    return examples.find((example) => example.prompt.toLowerCase() === normalized)?.id ?? null;
  }
  const edited = examples.find((example) => example.edits.some((edit) => edit.toLowerCase() === normalized));
  return edited?.id ?? previous;
}

function markStatus(state: HistoryState, status: TurnStatus): HistoryState {
  if (state.cursor === null) return state;
  return {
    ...state,
    turns: state.turns.map((turn, index) => (index === state.cursor ? { ...turn, status } : turn)),
  };
}

export default function App() {
  const [mode, setMode] = useState<RunMode | null>(null);
  const [examples, setExamples] = useState<ExampleScene[]>([]);
  const [forceMock, setForceMock] = useState(false);
  const [model, setModel] = useState<ModelChoice>("pro");
  const [effort, setEffort] = useState<Effort>("high");
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [streamReasoning, setStreamReasoning] = useState("");
  const [streamContent, setStreamContent] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState>({ turns: [], cursor: null });
  const [sceneError, setSceneError] = useState<SceneError | null>(null);
  const [liveRun, setLiveRun] = useState<LiveRun | null>(null);
  const [tab, setTab] = useState("code");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [nextMode, nextExamples] = await Promise.all([getMode(), getExamples()]);
        if (cancelled) return;
        setMode(nextMode.mode);
        setExamples(nextExamples);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = history.cursor === null ? null : (history.turns[history.cursor] ?? null);
  const showingMock = mode !== "live" || forceMock;
  const panelCode = running ? streamingCodePreview(streamContent) : (active?.code ?? "");
  const panelBase = running ? (active?.code ?? "") : (active?.baseCode ?? "");
  const panelReasoning = running ? streamReasoning : (active?.reasoning ?? "");

  function launch(code: string) {
    const verdict = guardCode(code);
    if (!verdict.ok) {
      setSceneError({ phase: "blocked", message: verdict.message });
      setHistory((prev) => markStatus(prev, "runtime error"));
      return;
    }
    setSceneError(null);
    setLiveRun((prev) => ({ token: (prev?.token ?? 0) + 1, code }));
  }

  async function runTurn(kind: TurnKind, text: string, failure?: SceneError) {
    const trimmed = text.trim();
    if (!trimmed || running) return;
    const baseCode = kind === "generate" ? "" : (active?.code ?? "");
    if (kind !== "generate" && !baseCode) {
      toast.error("Generate a scene before editing it");
      return;
    }
    setRunning(true);
    setStreamError(null);
    setStreamReasoning("");
    setStreamContent("");
    setTab("code");
    if (kind !== "fix") setSceneError(null);
    let reasoningText = "";
    let modelId = model === "pro" ? "kimi-k3.1-pro" : "kimi-k3.1-pro-highspeed";
    const previousScene = active?.sceneId ?? null;
    const requestEffort = effort;
    const requestModel = model;

    const onEvent = (event: TurnEvent) => {
      switch (event.type) {
        case "start":
          modelId = event.modelId;
          return;
        case "reasoning":
          reasoningText += event.text;
          setStreamReasoning(reasoningText);
          return;
        case "content":
          setStreamContent((current) => current + event.text);
          return;
        case "done": {
          const record: TurnRecord = {
            id: crypto.randomUUID(),
            kind,
            prompt: trimmed,
            model: requestModel,
            modelId,
            effort: requestEffort,
            code: event.code,
            baseCode,
            reasoning: reasoningText,
            usage: event.usage,
            timings: event.timings,
            costUsd: event.costUsd,
            status: "ok",
            synthetic: event.synthetic,
            sceneId: sceneIdFor(examples, kind, trimmed, previousScene),
          };
          setHistory((prev) => ({ turns: [...prev.turns, record], cursor: prev.turns.length }));
          setRunning(false);
          launch(event.code);
          return;
        }
        case "error":
          setStreamError(event.message);
          toast.error(event.message);
          setRunning(false);
          return;
        default: {
          const unreachable: never = event;
          return unreachable;
        }
      }
    };

    try {
      await streamTurn(
        {
          kind,
          prompt: trimmed,
          currentCode: kind === "generate" ? undefined : baseCode,
          error: failure ? { phase: failure.phase, message: failure.message, line: failure.line } : undefined,
          model: requestModel,
          effort: requestEffort,
          forceMock: mode === "live" && forceMock ? true : undefined,
        },
        onEvent,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Turn failed");
      setRunning(false);
    }
  }

  function restore(index: number) {
    const turn = history.turns[index];
    if (!turn || running) return;
    setHistory((prev) => ({ ...prev, cursor: index }));
    setTab("code");
    setSceneError(null);
    launch(turn.code);
  }

  function newScene() {
    setPrompt("");
    setHistory((prev) => ({ ...prev, cursor: null }));
    setSceneError(null);
    setLiveRun(null);
    setStreamContent("");
    setStreamReasoning("");
    setStreamError(null);
    setTab("code");
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight">Kimi 3D Scene Builder</h1>
          <p className="text-[11px] text-muted-foreground">
            Moonshot says Highspeed is about 2–3× faster at 2× the token price.{" "}
            {showingMock
              ? "These timings are illustrative, not a measurement of that claim."
              : "Latency here is measured on the server."}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {mode === "live" && (
            <Button
              type="button"
              size="sm"
              variant={forceMock ? "secondary" : "outline"}
              data-testid="force-mock"
              onClick={() => setForceMock((value) => !value)}
            >
              {forceMock ? "Using mock examples" : "Use mock examples"}
            </Button>
          )}
          {showingMock ? (
            <Badge data-testid="mode-badge" className="h-auto bg-amber-100 px-2 py-1 text-amber-950">
              Mock: hand-written examples, no API calls
            </Badge>
          ) : (
            <Badge data-testid="mode-badge">Live</Badge>
          )}
        </div>
      </header>
      {showingMock && (
        <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-950" data-testid="mock-banner">
          The code was written by hand to illustrate the flow, not generated by Kimi.
        </div>
      )}
      <PromptBar
        prompt={prompt}
        onPrompt={setPrompt}
        model={model}
        onModel={setModel}
        effort={effort}
        onEffort={setEffort}
        examples={examples}
        sceneId={active?.sceneId ?? null}
        hasScene={Boolean(active)}
        running={running}
        onGenerate={(text) => {
          setPrompt(text);
          void runTurn("generate", text);
        }}
        onEdit={(text) => {
          setPrompt(text);
          void runTurn("edit", text);
        }}
        onNewScene={newScene}
      />
      {streamError && (
        <div className="border-b px-4 py-2 text-sm text-destructive" data-testid="stream-error">
          {streamError}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <section className="relative flex min-h-0 min-w-0 flex-[1.45] flex-col">
          <SceneFrame
            run={liveRun}
            onReady={() => {
              setSceneError(null);
              setHistory((prev) => {
                const turn = prev.cursor === null ? null : prev.turns[prev.cursor];
                if (!turn || turn.kind !== "fix") return prev;
                return markStatus(prev, "fixed");
              });
            }}
            onError={(error) => {
              setSceneError(error);
              setHistory((prev) => markStatus(prev, "runtime error"));
            }}
            onTimeout={(error) => {
              setSceneError(error);
              setHistory((prev) => markStatus(prev, "runtime error"));
            }}
          />
          {sceneError && (
            <div className="absolute right-3 bottom-3 left-3 z-10">
              <ErrorCallout
                error={sceneError}
                disabled={running || !active}
                onFix={() => {
                  if (!active || !sceneError) return;
                  void runTurn("fix", active.prompt, sceneError);
                }}
              />
            </div>
          )}
        </section>
        <section className="flex min-h-0 w-[min(440px,42vw)] min-w-[320px] flex-col border-l">
          <CodePanel
            code={panelCode}
            baseCode={panelBase}
            reasoning={panelReasoning}
            tab={tab}
            onTab={setTab}
            streaming={running}
          />
        </section>
      </div>
      <TurnHistory turns={history.turns} cursor={history.cursor} disabled={running} onRestore={restore} />
    </div>
  );
}
