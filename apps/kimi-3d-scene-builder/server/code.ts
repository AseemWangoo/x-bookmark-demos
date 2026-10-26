export type ExtractResult = { ok: true; code: string } | { ok: false; message: string };

const FENCE = /```(?:js|javascript)\s*\n([\s\S]*?)```/gi;

export function extractCode(content: string): ExtractResult {
  const matches = [...content.matchAll(FENCE)];
  let raw: string | null = null;
  if (matches.length > 0) {
    raw = matches[matches.length - 1]?.[1] ?? "";
  } else if (looksLikeCode(content)) {
    raw = content;
  } else {
    return { ok: false, message: "no code returned" };
  }
  const code = stripExportDefault(raw).trim();
  if (!code) return { ok: false, message: "no code returned" };
  return { ok: true, code };
}

function looksLikeCode(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  if (/\bkit\./.test(trimmed)) return true;
  if (/function\s+build\s*\(/.test(trimmed)) return true;
  const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
  const codeLines = lines.filter((line) => /^(const|let|var|return|if|for|while|function|\/\/)/.test(line));
  return lines.length >= 2 && codeLines.length / lines.length > 0.5;
}

function stripExportDefault(code: string): string {
  const wrapped = code
    .trim()
    .match(/^(?:export\s+default\s+)?function\s+build\s*\(\s*kit\s*\)\s*\{([\s\S]*)\}\s*$/);
  const body = wrapped?.[1] ?? code;
  return body.replace(/export\s+default\s+/g, "");
}
