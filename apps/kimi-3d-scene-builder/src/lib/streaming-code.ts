export function streamingCodePreview(content: string): string {
  const fence = /```(?:js|javascript)\s*\n/gi;
  let start = -1;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(content))) {
    start = match.index + match[0].length;
  }
  if (start < 0) return content;
  return content.slice(start).replace(/```[\s\S]*$/, "");
}
