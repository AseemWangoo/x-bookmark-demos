import { MAX_IMAGE_BYTES } from "../shared/copy.ts";

const DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,([a-z0-9+/=\r\n]+)$/i;

export function imageByteLength(dataUrl: string): number | null {
  const match = DATA_URL.exec(dataUrl.trim());
  if (!match) return null;
  const body = (match[2] ?? "").replace(/\s/g, "");
  if (body.length === 0 || body.length % 4 !== 0) return null;
  if (!/^[a-z0-9+/]+={0,2}$/i.test(body)) return null;
  const pad = body.endsWith("==") ? 2 : body.endsWith("=") ? 1 : 0;
  return Math.floor((body.length * 3) / 4) - pad;
}

export function validateImageDataUrl(dataUrl: string): string | null {
  const bytes = imageByteLength(dataUrl);
  if (bytes === null) return "Each photo must be a PNG, JPEG, WEBP, or GIF data URL.";
  if (bytes > MAX_IMAGE_BYTES) return "Each photo must be 10 MB or smaller.";
  return null;
}
