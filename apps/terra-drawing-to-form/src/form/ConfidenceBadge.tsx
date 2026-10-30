import { Badge } from "@/components/ui/badge"

import { confidenceTone } from "../lib/confidence"

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const tone = confidenceTone(confidence)
  return (
    <Badge className={`confidence confidence-${tone}`} variant="outline">
      {Math.round(confidence * 100)}%
    </Badge>
  )
}
