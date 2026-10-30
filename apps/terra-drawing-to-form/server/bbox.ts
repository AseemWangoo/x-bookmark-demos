import type { BoundingBox } from "../src/lib/types"

export function normalizeBbox(
  bbox: [number, number, number, number] | null,
  width: number,
  height: number,
): BoundingBox | null {
  if (!bbox || width <= 0 || height <= 0) return null

  const [rawX0, rawY0, rawX1, rawY1] = bbox
  const x0 = Math.min(width, Math.max(0, Math.min(rawX0, rawX1)))
  const x1 = Math.min(width, Math.max(0, Math.max(rawX0, rawX1)))
  const y0 = Math.min(height, Math.max(0, Math.min(rawY0, rawY1)))
  const y1 = Math.min(height, Math.max(0, Math.max(rawY0, rawY1)))

  if (x1 <= x0 || y1 <= y0) return null

  return {
    x: x0 / width,
    y: y0 / height,
    w: (x1 - x0) / width,
    h: (y1 - y0) / height,
  }
}
