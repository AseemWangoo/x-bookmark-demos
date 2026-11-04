export function Sparkline({ values }: { values: number[] }) {
  const width = 280;
  const height = 52;
  const max = 500;
  const y44 = height - (44 / max) * height;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (Math.min(value, max) / max) * height;
    return { x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area =
    points.length > 0
      ? `0,${height} ${line} ${points[points.length - 1]?.x ?? width},${height}`
      : "";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full text-primary" data-testid="sparkline">
      <line
        x1="0"
        x2={width}
        y1={y44}
        y2={y44}
        stroke="currentColor"
        strokeDasharray="3 2"
        opacity="0.7"
      />
      {area ? <polygon points={area} fill="currentColor" opacity="0.18" /> : null}
      {line ? <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" /> : null}
    </svg>
  );
}
