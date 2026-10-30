import { Activity, Clock3, Coins, Cpu, Sparkles } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { PRICING_SOURCE } from "../lib/pricing"
import type { Effort, ExtractionResponse } from "../lib/types"

export function RunPanel({
  extraction,
  mode,
  model,
  effort,
  onEffort,
}: {
  extraction: ExtractionResponse | null
  mode: "mock" | "live"
  model: string
  effort: Effort
  onEffort: (effort: Effort) => void
}) {
  return (
    <section className="run-panel">
      <div className="run-stat">
        <Activity />
        <span>Mode<strong>{mode === "mock" ? "Mock · synthetic" : "Live"}</strong></span>
      </div>
      <div className="run-stat">
        <Cpu />
        <span>Model<strong>{model}</strong></span>
      </div>
      <div className="run-stat effort-stat">
        <Sparkles />
        <span>Reasoning</span>
        <Select
          value={effort}
          disabled={mode === "mock"}
          onValueChange={(value) => onEffort(value as Effort)}
        >
          <SelectTrigger aria-label="Reasoning effort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["none", "low", "medium", "high"] as const).map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="run-stat">
        <Clock3 />
        <span>Latency<strong>{extraction ? `${extraction.latencyMs} ms` : "—"}</strong></span>
      </div>
      <div className="run-stat">
        <Coins />
        <span>
          Usage
          <strong>
            {extraction
              ? `${extraction.usage.inputTokens.toLocaleString()} in · ${extraction.usage.outputTokens.toLocaleString()} out · $${extraction.usage.costUsd.toFixed(4)}`
              : "—"}
          </strong>
        </span>
      </div>
      <a href={PRICING_SOURCE} target="_blank" rel="noreferrer">
        $1 / $5 per 1M tokens
      </a>
      {mode === "mock" ? <em>Illustrative timing and usage</em> : null}
    </section>
  )
}
