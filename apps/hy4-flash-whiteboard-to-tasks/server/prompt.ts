import type { ExtractImage } from "../shared/types.ts";

export const SYSTEM_PROMPT = [
  "You extract a task board from whiteboard images and a pasted document.",
  "Return JSON only. The JSON must match the schema.",
  "Every task and open question needs a source.",
  "Image sources use the image id and filename given in the user message, a short visual quote, and an approximate region.",
  "Regions are normalized 0-1 boxes: x and y are the top-left, w and h are width and height. They are approximate, not pixel OCR.",
  "Text sources use 1-based line numbers from the numbered thread and a short exact quote from those lines.",
  "Use null for source fields that do not apply.",
  "priority is low, medium, or high. status is todo, in_progress, blocked, or done.",
  "Do not invent tasks that are not supported by a visible mark or a passage in the thread.",
  "If nothing actionable is present, return an empty tasks array and say so in summary.",
].join(" ");

export type ImagePart = {
  type: "image_url";
  image_url: { url: string; detail: "high" };
};

export type TextPart = { type: "text"; text: string };

export function numberedTranscript(text: string, images: Pick<ExtractImage, "id" | "name">[]): string {
  const legend = images.length
    ? images.map((image) => `Image id=${image.id} filename=${image.name}`).join("\n")
    : "No images were attached.";
  const lines = text.split("\n").map((line, index) => `${index + 1}|${line}`).join("\n");
  return `${legend}\n\nNumbered thread (line numbers are 1-based):\n${lines}`;
}

export function buildUserContent(text: string, images: ExtractImage[]): Array<ImagePart | TextPart> {
  const parts: Array<ImagePart | TextPart> = images.map((image) => ({
    type: "image_url",
    image_url: { url: image.dataUrl, detail: "high" },
  }));
  parts.push({ type: "text", text: numberedTranscript(text, images) });
  return parts;
}

export function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  return (fenced?.[1] ?? trimmed).trim();
}
