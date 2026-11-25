export function toCsv(headers: string[], rows: string[][], footer: string[][] = []): string {
  const lines = [headers, ...rows, ...footer];
  return `${lines.map((row) => row.map(escapeField).join(",")).join("\r\n")}\r\n`;
}

function escapeField(field: string): string {
  if (/[",\r\n]/.test(field)) return `"${field.replaceAll('"', '""')}"`;
  return field;
}
