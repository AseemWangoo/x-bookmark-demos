import { confidenceColor } from "../lib/confidence"
import type { EditableField } from "../lib/types"

interface BoxOverlayProps {
  fields: EditableField[]
  activeKey: string | null
  onActive: (key: string | null) => void
  onSelect: (key: string) => void
}

export function BoxOverlay({
  fields,
  activeKey,
  onActive,
  onSelect,
}: BoxOverlayProps) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-label="Model-reported source regions"
    >
      {fields.map((field) => {
        if (!field.bbox || field.value === null) return null
        const active = activeKey === field.key
        const dimmed = activeKey !== null && !active
        return (
          <g
            key={field.key}
            className="pointer-events-auto cursor-pointer transition-opacity"
            opacity={dimmed ? 0.2 : 1}
            data-box-key={field.key}
            onMouseEnter={() => onActive(field.key)}
            onMouseLeave={() => onActive(null)}
            onClick={() => onSelect(field.key)}
          >
            <rect
              x={field.bbox.x * 100}
              y={field.bbox.y * 100}
              width={field.bbox.w * 100}
              height={field.bbox.h * 100}
              rx="0.35"
              fill={`${confidenceColor(field.confidence)}22`}
              stroke={confidenceColor(field.confidence)}
              strokeWidth={active ? 0.7 : 0.35}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={field.bbox.x * 100}
              y={Math.max(field.bbox.y * 100 - 0.7, 1.7)}
              fill={confidenceColor(field.confidence)}
              fontSize="1.6"
              fontWeight="800"
              paintOrder="stroke"
              stroke="#fff"
              strokeWidth=".45"
              vectorEffect="non-scaling-stroke"
            >
              {field.key}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
