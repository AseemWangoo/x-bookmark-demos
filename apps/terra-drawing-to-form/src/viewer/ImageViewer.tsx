import { ScanSearch, ZoomIn, ZoomOut } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { EditableField, SourceImage } from "../lib/types"
import { BoxOverlay } from "./BoxOverlay"

interface ImageViewerProps {
  source: SourceImage
  fields: EditableField[]
  activeKey: string | null
  zoomed: boolean
  onZoom: () => void
  onActive: (key: string | null) => void
  onSelect: (key: string) => void
}

export function ImageViewer({
  source,
  fields,
  activeKey,
  zoomed,
  onZoom,
  onActive,
  onSelect,
}: ImageViewerProps) {
  return (
    <section className="viewer-shell">
      <div className="viewer-toolbar">
        <div>
          <p className="eyebrow">Source document</p>
          <h2>{source.name}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onZoom} data-testid="zoom-toggle">
          {zoomed ? <ZoomOut /> : <ZoomIn />}
          {zoomed ? "1×" : "2×"}
        </Button>
      </div>
      <div className="viewer-scroll">
        <div
          className="viewer-stage"
          style={{
            aspectRatio: `${source.width} / ${source.height}`,
            width: zoomed ? "200%" : "100%",
          }}
        >
          <img src={source.imageUrl} alt={source.name} draggable={false} />
          <BoxOverlay
            fields={fields}
            activeKey={activeKey}
            onActive={onActive}
            onSelect={onSelect}
          />
        </div>
      </div>
      <p className="viewer-note">
        <ScanSearch />
        Boxes and confidence are model-reported, not ground truth.
      </p>
    </section>
  )
}
