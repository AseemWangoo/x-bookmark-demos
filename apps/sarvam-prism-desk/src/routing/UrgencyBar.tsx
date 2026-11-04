export function UrgencyBar({
  probabilities,
  legend,
  score,
  label,
}: {
  probabilities: Record<string, number>;
  legend: Record<string, string>;
  score: number;
  label: string;
}) {
  const keys = Object.keys(probabilities).sort((a, b) => Number(a) - Number(b));
  return (
    <div data-testid="urgency-bar">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium">Urgency</span>
        <span>
          score {score.toFixed(2)} · <span data-testid="urgency-label">{label}</span>
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full">
        {keys.map((key) => (
          <div
            key={key}
            className="h-full bg-primary/80 odd:bg-primary/45"
            style={{ width: `${(probabilities[key] ?? 0) * 100}%` }}
            title={`${legend[key] ?? key} ${((probabilities[key] ?? 0) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {keys.map((key) => (
          <span key={key}>
            {legend[key] ?? key} {((probabilities[key] ?? 0) * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}
