const OPEN_FENCE = /^```([^\n`]*)\r?\n/;

export function stripMarkdownFence(input: string): string {
  const trimmed = input.trim();
  const open = OPEN_FENCE.exec(trimmed);
  if (!open) return trimmed;
  const language = (open[1] ?? "").trim().toLowerCase();
  if (language !== "" && language !== "markdown" && language !== "md") return trimmed;
  if (!trimmed.endsWith("```")) return trimmed;
  const start = open[0].length;
  const end = trimmed.lastIndexOf("```");
  if (end < start) return trimmed;
  return trimmed.slice(start, end).trim();
}

export function extractTableHtml(markdown: string): string[] {
  const tables: string[] = [];
  const pattern = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
  for (const match of markdown.matchAll(pattern)) {
    tables.push(match[0]);
  }
  return tables;
}
