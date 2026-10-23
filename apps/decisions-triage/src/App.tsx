import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { getFixtures, getMode, postTriage } from "@/lib/api";
import type { InboxMessage, RunMode, Strategy, TriageResponse } from "@/lib/types";
import { InboxTable, type InboxViewRow } from "@/inbox/InboxTable";
import { MessageSheet } from "@/inbox/MessageSheet";
import { ComparePanel } from "@/run/ComparePanel";
import { RunBar } from "@/run/RunBar";
import { SummaryStrip } from "@/run/SummaryStrip";

export default function App() {
  const [mode, setMode] = useState<RunMode | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<Strategy>("per_message");
  const [compare, setCompare] = useState(false);
  const [threshold, setThreshold] = useState(0.5);
  const [forceMock, setForceMock] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [nextMode, inbox] = await Promise.all([getMode(), getFixtures()]);
        if (cancelled) return;
        setMode(nextMode.mode);
        setMessages(inbox);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!result) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const seen = new Set<string>();
    const revealDelay = result.decisions.synthetic ? 1.15 : 0;
    for (const row of result.decisions.rows) {
      timers.push(
        setTimeout(() => {
          seen.add(row.id);
          setRevealed(new Set(seen));
        }, Math.round(row.latencyMs * revealDelay)),
      );
    }
    const statuses = new Set(result.errors?.map((error) => error.status));
    if (statuses.has(401)) toast.error("OpenAI rejected the API key (401).");
    if (statuses.has(429)) toast.error("Rate limited (429). The rest of the batch is still shown.");
    const other = result.errors?.find((error) => error.status !== 401 && error.status !== 429);
    if (other && !statuses.has(401) && !statuses.has(429)) toast.error(other.message);
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [result]);

  const illustrative = mode === "mock" || forceMock || result?.mode === "mock" || result?.decisions.synthetic === true;

  const rows = useMemo<InboxViewRow[]>(() => {
    const view = messages.map((message) => {
      const decision = result?.decisions.rows.find((row) => row.id === message.id);
      const error = result?.errors?.find((item) => item.id === message.id && item.source === "decisions");
      return {
        message,
        decision,
        error,
        revealed: Boolean(decision) && (revealed.has(message.id) || !result?.decisions.synthetic),
      };
    });
    if (!result) return view;
    return view.sort((left, right) => {
      const leftScore = left.decision?.answers.priority.score ?? -1;
      const rightScore = right.decision?.answers.priority.score ?? -1;
      if (rightScore !== leftScore) return rightScore - leftScore;
      const leftUrgent = left.decision?.answers.urgent.probability ?? 0;
      const rightUrgent = right.decision?.answers.urgent.probability ?? 0;
      return rightUrgent - leftUrgent;
    });
  }, [messages, result, revealed]);

  const openMessage = messages.find((message) => message.id === openId) ?? null;

  async function run() {
    setRunning(true);
    setRevealed(new Set());
    try {
      const next = await postTriage({
        messageIds: "all",
        strategy,
        compare,
        forceMock: mode === "live" && forceMock ? true : undefined,
        urgentThreshold: threshold,
      });
      setResult(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Triage failed");
    } finally {
      setRunning(false);
    }
  }

  const badgeMock = mode !== "live" || forceMock;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[1280px] flex-col gap-5 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">OpenAI Decisions API</p>
          <h1 className="text-2xl font-medium tracking-tight">Inbox triage</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Ten fictional support messages. Each one is asked if it is urgent, which queue it belongs on, and what
            priority it is.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            data-testid="mode-badge"
            className={badgeMock ? "bg-amber-100 text-amber-950" : undefined}
            variant={badgeMock ? "outline" : "default"}
          >
            {mode === null ? "Checking mode…" : badgeMock ? "Mock: illustrative data" : "Live"}
          </Badge>
          {mode === "live" ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={forceMock} onCheckedChange={(checked) => setForceMock(checked === true)} />
              Use illustrative mock
            </label>
          ) : null}
        </div>
      </header>

      {badgeMock ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950" data-testid="mock-banner">
          Illustrative data. No calls are made to api.openai.com. Latencies, tokens, and costs are hand-written, not
          measured.
        </div>
      ) : (
        <div className="rounded-lg border px-3 py-2 text-sm">
          Live mode. Requests go to /v1/decisions and, if compare is on, /v1/responses. The API key stays on the server.
        </div>
      )}

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

      <RunBar
        strategy={strategy}
        compare={compare}
        threshold={threshold}
        running={running || mode === null}
        onStrategy={setStrategy}
        onCompare={setCompare}
        onThreshold={setThreshold}
        onRun={() => void run()}
      />

      {messages.length === 0 && !loadError ? (
        <p className="text-sm text-muted-foreground">Loading the inbox…</p>
      ) : null}

      {!result && messages.length > 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="empty-state">
          Run triage to score this inbox. The table lists the messages first; answers, latency, and agreement show up
          after the run.
        </p>
      ) : null}

      {compare && result && !result.responses ? (
        <p className="text-xs text-muted-foreground">Run triage again to add the Responses comparison.</p>
      ) : null}

      {result ? <SummaryStrip batch={result.decisions} messageCount={messages.length} /> : null}

      {result?.responses ? (
        <ComparePanel messages={messages} decisions={result.decisions} responses={result.responses} />
      ) : null}

      {messages.length > 0 ? (
        <InboxTable rows={rows} threshold={threshold} illustrative={illustrative} onOpen={setOpenId} />
      ) : null}

      <MessageSheet
        message={openMessage}
        decision={result?.decisions.rows.find((row) => row.id === openId)}
        response={result?.responses?.rows.find((row) => row.id === openId)}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
      />
    </main>
  );
}
