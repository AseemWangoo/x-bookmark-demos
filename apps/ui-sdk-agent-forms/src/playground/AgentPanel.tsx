import { agentTools } from "@ui-sdk/react/agent"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { AgentView, ToolCallLog, WebMcpStatus } from "../adapter/types"

function leadSentence(description: string): string {
  const breakAt = description.indexOf(". ")
  return breakAt === -1 ? description : description.slice(0, breakAt + 1)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function logLine(entry: ToolCallLog): string {
  if (entry.tool === "snapshot" && Array.isArray(entry.output)) {
    return `${entry.output.length} components`
  }
  if (entry.tool === "query") {
    if (!Array.isArray(entry.output)) return "error"
    const match = entry.output.find(isRecord)
    const items = match?.items
    return Array.isArray(items) ? `${items.length} items` : `${entry.output.length} matches`
  }
  if (entry.tool === "act" && isRecord(entry.output)) {
    return entry.output.ok === true ? "ok" : "stopped"
  }
  return ""
}

type AgentPanelProps = {
  status: WebMcpStatus
  snapshot: AgentView[]
  log: ToolCallLog[]
  onRefresh: () => void
}

export function AgentPanel({ status, snapshot, log, onRefresh }: AgentPanelProps) {
  return (
    <aside aria-label="Agent tools" className="flex min-h-0 flex-col gap-4">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">WebMCP</h2>
          <Badge variant={status.supported ? "default" : "secondary"}>
            registerTool {status.registerToolType}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{status.summary}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">agentTools</h2>
        <ul className="flex flex-col gap-2">
          {agentTools.map((tool) => (
            <li key={tool.name} className="rounded-lg border border-border px-3 py-2">
              <p className="font-mono text-sm">{tool.name}</p>
              <p className="text-xs text-muted-foreground">{leadSentence(tool.description)}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">agent.snapshot()</h2>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button type="button" variant="outline" size="sm" className="min-h-10" />
              }
              onClick={onRefresh}
            >
              Refresh
            </TooltipTrigger>
            <TooltipContent>Read agent.snapshot() again</TooltipContent>
          </Tooltip>
        </div>
        <ScrollArea className="h-64 rounded-lg border border-border">
          <pre className="p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </ScrollArea>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Scripted fill log</h2>
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tool calls yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {log.map((entry, index) => (
              <li key={entry.id} className="rounded-lg border border-border px-3 py-2">
                <p className="font-mono text-sm">
                  {index + 1}. {entry.tool}
                  <span className="text-muted-foreground"> {logLine(entry)}</span>
                </p>
                <details className="mt-1">
                  <summary className="cursor-default text-xs text-muted-foreground">
                    Input and result
                  </summary>
                  <pre className="mt-1 max-h-40 overflow-auto font-mono text-xs whitespace-pre-wrap">
                    {JSON.stringify({ input: entry.input, output: entry.output }, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  )
}
