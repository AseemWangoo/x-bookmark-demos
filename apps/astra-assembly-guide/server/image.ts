const DATA_URL = /^data:image\/(png|jpeg|webp);base64,([a-z0-9+/]+={0,2})$/i;
const MAX_BYTES = 10 * 1024 * 1024;

export function parseImageDataUrl(value: string): { mime: string; bytes: number } | null {
  const match = DATA_URL.exec(value.trim());
  if (!match) return null;
  const payload = match[2];
  if (!payload) return null;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((payload.length * 3) / 4) - padding;
  if (bytes <= 0 || bytes > MAX_BYTES) return null;
  return { mime: match[1]!.toLowerCase() === "jpeg" ? "image/jpeg" : `image/${match[1]!.toLowerCase()}`, bytes };
}
