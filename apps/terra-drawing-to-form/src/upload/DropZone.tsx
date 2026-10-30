import { useRef, useState } from "react"
import { ImageUp } from "lucide-react"

import { Button } from "@/components/ui/button"

export function DropZone({
  compact = false,
  onFile,
}: {
  compact?: boolean
  onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const receive = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      className={`drop-zone ${compact ? "drop-zone-compact" : ""} ${dragging ? "drop-zone-dragging" : ""}`}
      data-testid="drop-zone"
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        receive(event.dataTransfer.files)
      }}
    >
      <ImageUp />
      <div>
        <strong>Drop a drawing or form</strong>
        <span>PNG, JPEG, or WEBP · 10 MB max</span>
      </div>
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        Choose file
      </Button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => receive(event.target.files)}
      />
    </div>
  )
}
