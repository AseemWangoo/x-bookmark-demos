import { MAX_FILE_BYTES } from "../../shared/copy.ts";

export const FILE_ACCEPT = "image/png,image/jpeg,image/webp,application/pdf,.png,.jpg,.jpeg,.webp,.pdf";

export type ImageMime = "image/png" | "image/jpeg" | "image/webp";

export type FileDecision =
  | { kind: "image"; mime: ImageMime }
  | { kind: "pdf" }
  | { kind: "empty" }
  | { kind: "too-big" }
  | { kind: "rejected" };

const IMAGE_MIMES = new Set<ImageMime>(["image/png", "image/jpeg", "image/webp"]);

export function classifyFile(file: File): FileDecision {
  if (file.size === 0) return { kind: "empty" };
  if (file.size > MAX_FILE_BYTES) return { kind: "too-big" };
  const mime = mimeOf(file);
  if (mime === "application/pdf") return { kind: "pdf" };
  if (isImageMime(mime)) return { kind: "image", mime };
  return { kind: "rejected" };
}

export function fileError(decision: FileDecision): string | null {
  switch (decision.kind) {
    case "image":
    case "pdf":
      return null;
    case "empty":
      return "That file is empty.";
    case "too-big":
      return "That file is over 15 MB.";
    case "rejected":
      return "Use a PNG, JPEG, WebP, or PDF.";
    default: {
      const neverKind: never = decision;
      return neverKind;
    }
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read that file."));
        return;
      }
      const comma = reader.result.indexOf(",");
      resolve(comma >= 0 ? reader.result.slice(comma + 1) : reader.result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that file."));
    reader.readAsDataURL(blob);
  });
}

function mimeOf(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".pdf")) return "application/pdf";
  return "";
}

function isImageMime(mime: string): mime is ImageMime {
  return IMAGE_MIMES.has(mime as ImageMime);
}
