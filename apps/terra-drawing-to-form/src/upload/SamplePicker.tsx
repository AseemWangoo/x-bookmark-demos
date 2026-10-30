import { FileCog, FilePenLine, Gauge } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

import type { Sample } from "../lib/types"

const icons = {
  "bracket-drawing": FileCog,
  "service-request-form": FilePenLine,
  "motor-spec-sheet": Gauge,
}

export function SamplePicker({
  samples,
  activeId,
  onSelect,
}: {
  samples: Sample[]
  activeId?: string
  onSelect: (sample: Sample) => void
}) {
  return (
    <div className="sample-grid">
      {samples.map((sample) => {
        const Icon = icons[sample.id as keyof typeof icons] ?? FileCog
        return (
          <Card
            key={sample.id}
            className={`sample-card ${activeId === sample.id ? "sample-card-active" : ""}`}
          >
            <button
              type="button"
              onClick={() => onSelect(sample)}
              data-sample-id={sample.id}
            >
              <CardContent>
                <span className="sample-icon"><Icon /></span>
                <span>
                  <strong>{sample.title}</strong>
                  <small>{sample.kind}</small>
                </span>
              </CardContent>
            </button>
          </Card>
        )
      })}
    </div>
  )
}
