import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { AppsPanel } from "@/apps/AppsPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { DesktopView } from "@/desktop/DesktopView"
import { fetchEnvelope, fetchMode, runTask, snapshotFromEnvelope } from "@/lib/api"
import type { AppRow, Envelope, ModeInfo, SnapshotView, StepLog } from "@/lib/types"
import { StepLog as StepLogView } from "@/run/StepLog"
import { presets, TaskBar } from "@/run/TaskBar"
import { TreePanel } from "@/tree/TreePanel"

export default function App() {
  const [mode, setMode] = useState<ModeInfo | null>(null)
  const [apps, setApps] = useState<AppRow[]>([])
  const [appsError, setAppsError] = useState<string | null>(null)
  const [appsLoading, setAppsLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<SnapshotView | null>(null)
  const [snapshots, setSnapshots] = useState<Record<string, SnapshotView>>({})
  const [treeLoading, setTreeLoading] = useState(false)
  const [treeError, setTreeError] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const [prompt, setPrompt] = useState<string>(presets[0].prompt)
  const [steps, setSteps] = useState<StepLog[]>([])
  const [running, setRunning] = useState(false)
  const [usedRefs, setUsedRefs] = useState<string[]>([])
  const [focusedRef, setFocusedRef] = useState<string | null>(null)
  const [shot, setShot] = useState<string | null>(null)

  const loadApps = useCallback(async () => {
    setAppsLoading(true)
    setAppsError(null)
    try {
      const envelope = await fetchEnvelope("/api/apps")
      if (!envelope.ok) {
        setAppsError(envelope.error?.message ?? "list-apps failed")
        setApps([])
        return
      }
      const rows = readApps(envelope)
      setApps(rows)
    } catch (error) {
      setAppsError(error instanceof Error ? error.message : "list-apps failed")
    } finally {
      setAppsLoading(false)
    }
  }, [])

  const loadSnapshot = useCallback(async (app: string) => {
    setTreeLoading(true)
    setTreeError(null)
    try {
      const envelope = await fetchEnvelope(`/api/snapshot?app=${encodeURIComponent(app)}`)
      const view = snapshotFromEnvelope(envelope)
      if (!view) {
        setTreeError(envelope.error?.message ?? "snapshot failed")
        setSnapshot(null)
        return
      }
      setSnapshot(view)
      setSnapshots((current) => ({ ...current, [view.snapshotId]: view }))
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : "snapshot failed")
    } finally {
      setTreeLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMode()
      .then(setMode)
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "mode failed")
      })
    void loadApps()
  }, [loadApps])

  function selectApp(name: string) {
    setSelected(name)
    setShot(`/api/screenshot?app=${encodeURIComponent(name)}`)
    void loadSnapshot(name)
  }

  function rememberSnapshot(step: StepLog) {
    const envelope = step.envelope as Envelope
    if (envelope.command !== "snapshot") return
    const view = snapshotFromEnvelope(envelope)
    if (!view) return
    setSnapshots((current) => ({ ...current, [view.snapshotId]: view }))
    setSnapshot(view)
    setSelected(view.app)
  }

  async function onRun() {
    setRunning(true)
    setSteps([])
    setUsedRefs([])
    setFocusedRef(null)
    try {
      const result = await runTask(prompt, (step) => {
        setSteps((current) => [...current, step])
        if (step.refs.length > 0) {
          setUsedRefs((current) => [...new Set([...current, ...step.refs])])
          const last = step.refs[step.refs.length - 1]
          if (last) setFocusedRef(last)
        }
        rememberSnapshot(step)
        if (step.screenshotUrl) setShot(step.screenshotUrl)
      })
      if (!result.ok) toast.error("The run stopped on a failed step")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "run failed")
    } finally {
      setRunning(false)
    }
  }

  function focusRef(ref: string, snapshotId: string | null) {
    setFocusedRef(ref)
    const id = snapshotId ?? ref.split(":")[0]?.slice(1)
    if (id && snapshots[id]) setSnapshot(snapshots[id])
  }

  const reason = mode?.reason
  return (
    <div className="flex h-screen min-h-0 flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <div className="text-sm font-medium">Agent Desktop Playground</div>
        <Badge data-testid="mode-badge" variant={mode?.mode === "live" ? "default" : "secondary"}>
          {mode ? (mode.mode === "live" ? "Live (AT-SPI)" : "Replay (recorded)") : "…"}
        </Badge>
        {mode?.synthetic ? (
          <Badge data-testid="synthetic-badge" variant="outline">
            synthetic recording
          </Badge>
        ) : null}
        {reason ? <span className="truncate text-[11px] text-muted-foreground">{reason}</span> : null}
        <span className="ml-auto truncate text-[11px] text-muted-foreground">
          agent-desktop {mode?.agentDesktopVersion ?? "…"} · {mode?.os ?? ""}
        </span>
        <Button
          size="xs"
          variant="outline"
          onClick={() => {
            void fetch("/api/trace")
              .then(async (response) => {
                const body = (await response.json()) as { ok?: boolean; error?: { message?: string } }
                if (!body.ok) toast.message(body.error?.message ?? "trace unavailable")
                else toast.success("Trace loaded in the console")
                console.log(body)
              })
              .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "trace failed"))
          }}
        >
          Trace
        </Button>
      </header>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.15fr)_auto_minmax(0,0.95fr)]">
        <div className="grid min-h-0 grid-cols-[220px_minmax(0,1fr)_280px]">
          <AppsPanel
            apps={apps}
            selected={selected}
            loading={appsLoading}
            error={appsError}
            onSelect={selectApp}
            onRefresh={() => void loadApps()}
          />
          <TreePanel
            snapshot={snapshot}
            loading={treeLoading}
            error={treeError}
            filter={filter}
            onFilter={setFilter}
            usedRefs={usedRefs}
            focusedRef={focusedRef}
            onFocusRef={(ref) => focusRef(ref, null)}
          />
          <DesktopView app={selected} src={shot} />
        </div>
        <TaskBar prompt={prompt} running={running} onPrompt={setPrompt} onRun={() => void onRun()} />
        <StepLogView steps={steps} onFocusRef={focusRef} />
      </div>
      <Toaster />
    </div>
  )
}

function readApps(envelope: Envelope): AppRow[] {
  if (!envelope.data || typeof envelope.data !== "object") return []
  const rows = (envelope.data as { apps?: unknown }).apps
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const record = row as { name?: unknown; pid?: unknown; bundle_id?: unknown; presentation?: unknown }
    if (typeof record.name !== "string") return []
    return [
      {
        name: record.name,
        pid: typeof record.pid === "number" ? record.pid : undefined,
        bundle_id: typeof record.bundle_id === "string" ? record.bundle_id : undefined,
        presentation: typeof record.presentation === "string" ? record.presentation : undefined,
      },
    ]
  })
}
