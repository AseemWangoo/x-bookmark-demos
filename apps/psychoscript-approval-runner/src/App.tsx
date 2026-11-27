import { useEffect, useState } from "react"
import { toast } from "sonner"

import { ApprovalCard } from "@/desk/ApprovalCard"
import { ModeBanner } from "@/desk/ModeBanner"
import { ResultPane } from "@/desk/ResultPane"
import { ScriptPane } from "@/desk/ScriptPane"
import { Timeline } from "@/desk/Timeline"
import { ApiError, decideRun, fetchMeta, fetchRun, fetchSample, startRun } from "@/lib/api"
import type { Decision, MetaView, RunView } from "../shared/types.ts"

export default function App() {
  const [meta, setMeta] = useState<MetaView | null>(null)
  const [code, setCode] = useState("")
  const [view, setView] = useState<RunView | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void fetchMeta(controller.signal)
      .then(setMeta)
      .catch(() => {
        if (!controller.signal.aborted) setMeta(null)
      })
    const id = new URLSearchParams(window.location.search).get("run")
    if (id) {
      void fetchRun(id, controller.signal)
        .then((loaded) => {
          setView(loaded)
          setCode(loaded.code)
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) toast.error(messageOf(error))
        })
    }
    return () => controller.abort()
  }, [])

  async function loadSample(): Promise<void> {
    try {
      setCode(await fetchSample())
    } catch (error) {
      toast.error(messageOf(error))
    }
  }

  async function run(): Promise<void> {
    const script = code.trim()
    if (!script || busy) return
    setBusy(true)
    try {
      const next = await startRun(script)
      setView(next)
      remember(next.id)
    } catch (error) {
      toast.error(messageOf(error))
    } finally {
      setBusy(false)
    }
  }

  async function decide(decision: Decision): Promise<void> {
    if (!view || busy) return
    setBusy(true)
    try {
      const next = await decideRun(view.id, decision)
      setView(next)
      remember(next.id)
    } catch (error) {
      toast.error(messageOf(error))
    } finally {
      setBusy(false)
    }
  }

  const status = statusText(view, busy)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-baseline justify-between gap-4 border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-medium tracking-tight">Psychoscript Approval Runner</h1>
          <p className="text-sm text-muted-foreground">
            A risky mock call suspends the VM. Approve or reject resumes from the snapshot bytes.
          </p>
        </div>
        {view ? <p className="font-mono text-xs text-muted-foreground">Run {view.id.slice(0, 8)}</p> : null}
      </header>
      <ModeBanner meta={meta} />
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      <main className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <ScriptPane
          code={code}
          busy={busy}
          onCode={setCode}
          onLoadSample={() => {
            void loadSample()
          }}
          onRun={() => {
            void run()
          }}
        />
        <div className="flex flex-col gap-4">
          <ApprovalCard
            view={view}
            busy={busy}
            onDecide={(decision) => {
              void decide(decision)
            }}
          />
          <ResultPane view={view} />
          <Timeline view={view} />
        </div>
      </main>
    </div>
  )
}

function remember(id: string): void {
  const url = new URL(window.location.href)
  url.searchParams.set("run", id)
  window.history.replaceState({}, "", url)
}

function statusText(view: RunView | null, busy: boolean): string {
  if (busy) return "Working."
  if (!view) return "No run yet."
  if (view.status === "suspended" && view.pending) {
    return `Paused on ${view.pending.name}. Snapshot ${view.snapshotBytes ?? 0} bytes.`
  }
  if (view.status === "finished") {
    if (view.result?.ok === false) return `Run failed: ${view.result.error.message}`
    return "Run finished."
  }
  return "Idle."
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return "Request failed."
}
