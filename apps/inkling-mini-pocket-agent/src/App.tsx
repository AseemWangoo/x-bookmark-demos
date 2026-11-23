import { useCallback, useEffect, useState } from "react";
import { FileText, Folder, ImageIcon, Play, Tag } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getFile, getFiles, getMode, streamRun } from "@/lib/api.ts";
import { MODEL_BADGE, RECORDED_LABEL, SAMPLE_NOTE } from "../shared/copy.ts";
import { TOKENS_PER_SEC_FORMULA } from "../shared/metrics.ts";
import type { AgentResult, FileKind, FilePreview, ModeReport, PocketFile, TraceEntry } from "../shared/types.ts";

type FolderChoice =
  | { rootId: "fixture"; customPath?: undefined }
  | { rootId: "custom"; customPath: string }
  | null;

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
}

function formatRate(value: number | null): string {
  if (value == null) return "n/a";
  return value.toFixed(1);
}

function previewArgs(args: Record<string, unknown>): string {
  const compact: Record<string, unknown> = { ...args };
  const markdown = compact.markdown;
  if (typeof markdown === "string" && markdown.length > 72) {
    compact.markdown = `${markdown.slice(0, 72)}…`;
  }
  const text = JSON.stringify(compact);
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

function kindIcon(kind: FileKind) {
  switch (kind) {
    case "receipt":
      return ImageIcon;
    case "note":
    case "summary":
    case "other":
      return FileText;
    default: {
      const neverKind: never = kind;
      return neverKind;
    }
  }
}

export default function App() {
  const [mode, setMode] = useState<ModeReport | null>(null);
  const [choice, setChoice] = useState<FolderChoice>(null);
  const [customDraft, setCustomDraft] = useState("");
  const [files, setFiles] = useState<PocketFile[]>([]);
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Pick the sample pocket or a local folder.");

  useEffect(() => {
    void getMode()
      .then((next) => {
        setMode(next);
        if (next.pocketFolder) setCustomDraft(next.pocketFolder);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Mode request failed";
        toast.error(message);
      });
  }, []);

  const loadFiles = useCallback(async (next: Exclude<FolderChoice, null>) => {
    const listed = await getFiles(next);
    setFiles(listed);
    setPreview(null);
    setHighlight(null);
    setTrace([]);
    setResult(null);
    setSummaryText(null);
    setStatus(next.rootId === "fixture" ? SAMPLE_NOTE : "Local folder listed. A recorded run will not invent a summary.");
  }, []);

  async function pickSample() {
    const next: FolderChoice = { rootId: "fixture" };
    setChoice(next);
    try {
      await loadFiles(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open the sample pocket";
      toast.error(message);
    }
  }

  async function pickCustom() {
    const customPath = customDraft.trim();
    if (!customPath) {
      toast.error("Enter an absolute folder path.");
      return;
    }
    const next: FolderChoice = { rootId: "custom", customPath };
    setChoice(next);
    try {
      await loadFiles(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open that folder";
      toast.error(message);
    }
  }

  async function openPath(filePath: string) {
    if (!choice) return;
    setHighlight(filePath);
    try {
      setPreview(await getFile(choice, filePath));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open the file";
      toast.error(message);
    }
  }

  async function runAgent() {
    if (!choice || running) return;
    setRunning(true);
    setTrace([]);
    setResult(null);
    setSummaryText(null);
    setPreview(null);
    setStatus("Running the pocket agent…");
    try {
      await streamRun(choice, (event) => {
        switch (event.type) {
          case "trace":
            setTrace((current) => [event.entry, ...current]);
            setStatus(`${event.entry.name} · ${event.entry.resultExcerpt}`);
            return;
          case "files":
            setFiles(event.files);
            return;
          case "summary":
            setSummaryText(event.markdown);
            setStatus(`Wrote ${event.path}`);
            return;
          case "result":
            setResult(event.result);
            setFiles(event.result.files);
            if (event.result.message) setStatus(event.result.message);
            return;
          case "error":
            toast.error(event.message);
            setStatus(event.message);
            return;
          default: {
            const neverEvent: never = event;
            throw new Error(`unknown event ${JSON.stringify(neverEvent)}`);
          }
        }
      });
      toast.success("Agent run finished");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Run failed";
      toast.error(message);
      setStatus(message);
    } finally {
      setRunning(false);
    }
  }

  const offline = mode?.offline === true;
  const rate = result?.tokensPerSec ?? null;

  return (
    <main id="pocket-desk" className="mx-auto flex h-screen max-w-[1440px] flex-col gap-2 overflow-hidden px-4 py-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Thinking Machines · local folder</p>
          <h1 className="text-2xl font-semibold tracking-tight">Inkling Mini Pocket Agent</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Sort, tag, and summarize notes and receipts. Tools stay inside the folder you pick. There is no delete tool.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{MODEL_BADGE}</Badge>
          {mode?.mock ? (
            <Badge data-testid="recorded-badge" variant="outline">
              {RECORDED_LABEL}
            </Badge>
          ) : null}
          <Tooltip>
            <TooltipTrigger
              data-testid="offline-badge"
              data-offline={offline ? "on" : "off"}
              className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium ${offline ? "offline-on" : "offline-off"}`}
            >
              {offline ? "Loopback only · offline" : "Offline badge off"}
            </TooltipTrigger>
            <TooltipContent>
              Green only for a live chat completion whose host is 127.0.0.1, localhost, or ::1. A hosted URL stays off.
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <Card size="sm" className="shrink-0">
        <CardHeader>
          <CardTitle>Mode</CardTitle>
          <CardDescription>{mode?.message ?? "Checking the local endpoint…"}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-1 text-xs text-muted-foreground">
          <p>
            Recorded demo is the default. Live needs <code>LOCAL_LLM_BASE_URL</code> on loopback and{" "}
            <code>LOCAL_LLM_MODEL</code> (default <code>inkling-2-mini</code>). <code>MOCK=1</code> forces this
            recording. Reasoning effort defaults to <code>low</code> (the template default is 0.9 if a server omits it).
          </p>
          <p className="font-mono text-[11px] leading-5 text-foreground">
            ollama run inkling-2-mini
            <span className="text-muted-foreground"> · Apple Silicon MLX · http://127.0.0.1:11434/v1</span>
          </p>
          <p className="font-mono text-[11px] leading-5 text-foreground">
            llama serve -hf ggml-org/Inkling-2-Mini-GGUF:IQ4_NL
            <span className="text-muted-foreground"> · http://127.0.0.1:9931/v1 · do not pass --tools all</span>
          </p>
        </CardContent>
      </Card>

      <section
        aria-label="Run metrics"
        className="grid shrink-0 gap-2 rounded-xl bg-card px-3 py-2 text-sm ring-1 ring-foreground/10 sm:grid-cols-3 lg:grid-cols-6"
      >
        <Metric testId="ttft" label="TTFT" value={result?.ttftMs == null ? "—" : `${result.ttftMs} ms`} />
        <Metric
          testId="tokens-per-sec"
          label="tokens/sec"
          value={formatRate(rate)}
          detail={result?.tokensPerSecLabel ?? TOKENS_PER_SEC_FORMULA}
        />
        <Metric
          label="tokens"
          value={
            result?.usage
              ? `${result.usage.inputTokens} in / ${result.usage.outputTokens} out`
              : "—"
          }
        />
        <Metric label="turns" value={result ? String(result.turns) : "—"} />
        <Metric label="wall" value={result?.wallMs == null ? "—" : `${result.wallMs} ms`} />
        <Metric label="model" value={result?.model ?? mode?.model ?? "inkling-2-mini"} />
      </section>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[340px_minmax(0,1fr)_380px]">
        <Card className="h-full min-h-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="size-4" /> Folder
            </CardTitle>
            <CardDescription>{status}</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" data-testid="sample-pocket" onClick={() => void pickSample()}>
                Sample pocket
              </Button>
              <Button type="button" variant="outline" disabled={!choice || running} data-testid="run-agent" onClick={() => void runAgent()}>
                <Play /> {running ? "Running" : "Run agent"}
              </Button>
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void pickCustom();
              }}
            >
              <input
                aria-label="Local folder path"
                className="h-8 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs"
                placeholder="/absolute/path"
                value={customDraft}
                onChange={(event) => setCustomDraft(event.target.value)}
              />
              <Button type="submit" variant="secondary" size="sm">
                Use folder
              </Button>
            </form>
            <ScrollArea className="min-h-0 flex-1 pr-3">
              <ul data-testid="file-list" className="flex flex-col gap-1">
                {files.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No folder loaded.</li>
                ) : (
                  files.map((file) => {
                    const Icon = kindIcon(file.kind);
                    return (
                      <li key={file.path}>
                        <button
                          type="button"
                          data-testid={`file-${file.path}`}
                          data-highlighted={highlight === file.path ? "true" : "false"}
                          className="flex w-full flex-col gap-1 rounded-lg px-2 py-2 text-left hover:bg-muted data-[highlighted=true]:bg-accent data-[highlighted=true]:ring-2 data-[highlighted=true]:ring-ring"
                          onClick={() => void openPath(file.path)}
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <Icon className="size-3.5 shrink-0" />
                            <span className="truncate font-medium">{file.name}</span>
                            <span className="ml-auto text-[11px] text-muted-foreground">{formatBytes(file.size)}</span>
                          </span>
                          <span className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                            <span>{file.kind}</span>
                            {file.tags.length === 0 ? (
                              <span>untagged</span>
                            ) : (
                              file.tags.map((tag) => (
                                <Badge key={tag} variant="outline">
                                  <Tag /> {tag}
                                </Badge>
                              ))
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </ScrollArea>
            {preview ? (
              <article aria-label="Open file" className="max-h-32 shrink-0 overflow-auto rounded-lg border bg-background p-2">
                <h2 className="mb-1 text-sm font-medium">{preview.path}</h2>
                {preview.dataUrl ? (
                  <img src={preview.dataUrl} alt={preview.path} className="max-h-36 rounded-md border" />
                ) : (
                  <pre className="max-h-36 overflow-auto text-xs whitespace-pre-wrap">{preview.text}</pre>
                )}
              </article>
            ) : null}
          </CardContent>
        </Card>

        <Card className="h-full min-h-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Tool-call trace</CardTitle>
            <CardDescription>
              {trace.length === 0 ? "Run the agent to stream list, read, tag, and summary calls." : `${trace.length} calls`}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <ol data-testid="trace" className="flex flex-col gap-2 pr-3">
                {trace.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        if (entry.highlightPath) void openPath(entry.highlightPath);
                      }}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span className="font-mono">{entry.name}</span>
                        <span className="ml-auto text-[11px] text-muted-foreground">{entry.durationMs} ms</span>
                      </span>
                      <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
                        {previewArgs(entry.args)}
                      </span>
                      <span className="mt-1 block text-xs">{entry.resultExcerpt}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="h-full min-h-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              {result?.recorded
                ? "Recorded fixture summary. Hand-authored, not model output."
                : summaryText
                  ? "Written inside the sandbox as pocket-summary.md."
                  : "pocket-summary.md appears here after a run."}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <article data-testid="summary" className="pr-3 text-sm whitespace-pre-wrap">
                {summaryText ?? result?.summaryMarkdown ?? "No summary yet."}
              </article>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
  testId,
}: {
  label: string;
  value: string;
  detail?: string;
  testId?: string;
}) {
  return (
    <div data-testid={testId}>
      <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
      {detail ? <div className="text-[10px] leading-4 text-muted-foreground">{detail}</div> : null}
    </div>
  );
}
