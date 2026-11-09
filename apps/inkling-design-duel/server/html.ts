export function extractHtml(content: string): string {
  const unfenced = unwrapFence(content).trim();
  const document =
    unfenced.match(/<!doctype html[\s\S]*<\/html>/i) ?? unfenced.match(/<html[\s\S]*<\/html>/i);
  return (document?.[0] ?? unfenced).trim();
}

function unwrapFence(content: string): string {
  const match = content.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return match?.[1] ?? content;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
