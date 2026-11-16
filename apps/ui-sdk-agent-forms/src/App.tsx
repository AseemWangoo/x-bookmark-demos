import { agent } from "./agent"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "next-themes"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { runScriptedFill, SCRIPTED_AGENT_LABEL } from "./adapter/scripted-fill"
import type { AgentView, FormSpec, ToolCallLog, WebMcpStatus } from "./adapter/types"
import { readWebMcpStatus } from "./adapter/webmcp-status"
import { FormCanvas } from "./form/render"
import { matchTemplate, SEED_PROMPT } from "./form/templates"
import { AgentPanel } from "./playground/AgentPanel"
import { PromptBar } from "./playground/PromptBar"

export function App() {
  const [prompt, setPrompt] = useState(SEED_PROMPT)
  const [spec, setSpec] = useState<FormSpec>(() => matchTemplate(SEED_PROMPT))
  const [formKey, setFormKey] = useState(0)
  const [receipt, setReceipt] = useState<string | null>(null)
  const [log, setLog] = useState<ToolCallLog[]>([])
  const [filling, setFilling] = useState(false)
  const [snapshot, setSnapshot] = useState<AgentView[]>([])
  const [status, setStatus] = useState<WebMcpStatus>(() => readWebMcpStatus())

  useEffect(() => {
    setStatus(readWebMcpStatus())
    const refresh = () => setSnapshot(agent.snapshot())
    refresh()
    return agent.subscribe(() => refresh())
  }, [formKey])

  function applyPrompt(nextPrompt: string) {
    const next = matchTemplate(nextPrompt)
    setPrompt(nextPrompt)
    setSpec(next)
    setFormKey((key) => key + 1)
    setReceipt(null)
    setLog([])
    toast.message(next.fallback ? "Fallback template" : "Recorded template", {
      description: next.matchNote,
    })
  }

  async function fill() {
    setFilling(true)
    setLog([])
    try {
      const plan = await runScriptedFill(
        {
          snapshot: () => agent.snapshot(),
          query: (input) => agent.query(input),
          act: (input) => agent.act(input),
        },
        spec.id,
        (entry) => setLog((current) => [...current, entry]),
      )
      setSnapshot(agent.snapshot())
      if (plan.steps.length === 0) {
        toast.error("Scripted fill made no changes", {
          description: plan.skipped.join(" "),
        })
      } else {
        toast.success("Scripted fill finished", {
          description: SCRIPTED_AGENT_LABEL,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scripted fill failed"
      toast.error(message)
    } finally {
      setFilling(false)
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-4 px-4 py-6">
          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-medium tracking-tight">UI SDK Agent Forms</h1>
              <Badge variant="secondary">Public beta</Badge>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Describe a form and get a keyboard-navigable UI SDK form. The fill button is a scripted caller of snapshot, query, and act.
            </p>
          </header>
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            Run with <code className="font-mono">cd apps/ui-sdk-agent-forms && bun install && bun run dev</code>.
            {" "}
            {spec.matchNote}
            {" "}
            WebMCP registration is attempted and is a no-op without document.modelContext.
          </p>
          <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Playground</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <PromptBar
                  prompt={prompt}
                  onPrompt={setPrompt}
                  onBuild={() => applyPrompt(prompt)}
                  onPick={applyPrompt}
                />
                <div key={formKey} className="flex flex-col gap-4 border-t border-border pt-4">
                  <FormCanvas spec={spec} onSubmitted={setReceipt} />
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-12 w-fit"
                      disabled={filling}
                      onClick={() => void fill()}
                    >
                      {filling ? "Filling…" : "Let an agent fill it"}
                    </Button>
                    <p className="text-sm text-muted-foreground">{SCRIPTED_AGENT_LABEL}</p>
                  </div>
                  <div aria-live="polite" className="min-h-16 rounded-lg bg-muted/50 px-3 py-2">
                    {receipt ? (
                      <>
                        <p className="text-sm font-medium">Submitted on this page</p>
                        <pre className="mt-1 font-mono text-xs whitespace-pre-wrap">{receipt}</pre>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Submit stays on this page. Nothing is sent to an API.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <AgentPanel
                  status={status}
                  snapshot={snapshot}
                  log={log}
                  onRefresh={() => setSnapshot(agent.snapshot())}
                />
              </CardContent>
            </Card>
          </div>
        </main>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}
