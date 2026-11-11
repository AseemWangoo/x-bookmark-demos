export function extractHtml(content: string): string | null {
  const unfenced = unwrapFence(content).trim();
  const match =
    unfenced.match(/<!doctype html[\s\S]*<\/html>/i) ?? unfenced.match(/<html[\s\S]*<\/html>/i);
  const document = match?.[0]?.trim();
  if (!document || !/<\/html>\s*$/i.test(document)) return null;
  return document;
}

function unwrapFence(content: string): string {
  const trimmed = content.trim();
  const whole = trimmed.match(/^```(?:html)?\s*([\s\S]*?)```$/i);
  if (whole?.[1]) return whole[1];
  const inner = trimmed.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return inner?.[1] ?? content;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
