import { readFileSync } from "node:fs";

const imageUrl = new URL("../public/fixtures/page.png", import.meta.url);
const markdownUrl = new URL("../shared/fixtures/recorded.md", import.meta.url);

export type RecordedFixture = {
  bytes: Uint8Array;
  markdown: string;
};

let cached: RecordedFixture | null = null;

export function loadFixture(): RecordedFixture {
  if (cached) return cached;
  const bytes = new Uint8Array(readFileSync(imageUrl));
  const markdown = readFileSync(markdownUrl, "utf8");
  cached = { bytes, markdown };
  return cached;
}

export function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return crypto.timingSafeEqual(left, right);
}

export function decodeImage(imageBase64: string): Uint8Array {
  const cleaned = imageBase64.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (!cleaned) return new Uint8Array();
  return new Uint8Array(Buffer.from(cleaned, "base64"));
}
