export function confidenceTone(confidence: number) {
  if (confidence >= 0.85) return "high"
  if (confidence >= 0.6) return "medium"
  return "low"
}

export function confidenceColor(confidence: number) {
  const tone = confidenceTone(confidence)
  if (tone === "high") return "#15966b"
  if (tone === "medium") return "#d28b16"
  return "#d54848"
}
