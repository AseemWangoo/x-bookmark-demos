export const FIELD_COLORS = [
  "#fde68a",
  "#bae6fd",
  "#a7f3d0",
  "#fecdd3",
  "#ddd6fe",
  "#fed7aa",
  "#99f6e4",
  "#f5d0fe",
  "#fef08a",
  "#c7d2fe",
] as const;

export function colorForIndex(index: number): string {
  return FIELD_COLORS[index % FIELD_COLORS.length] ?? FIELD_COLORS[0];
}

export function stripeBackground(colors: string[]): string {
  const bands = colors.flatMap((color, index) => {
    const start = index * 8;
    return `${color} ${start}px ${start + 8}px`;
  });
  return `repeating-linear-gradient(135deg, ${bands.join(", ")})`;
}
