const DATA_URL = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=\r\n]+)$/;

export type SketchImage = {
  mediaType: "image/png" | "image/jpeg";
  data: string;
};

export function parseImageDataUrl(dataUrl: string): SketchImage | null {
  const match = DATA_URL.exec(dataUrl.trim());
  if (!match) return null;
  const mediaType = match[1];
  if (mediaType !== "image/png" && mediaType !== "image/jpeg") return null;
  const data = match[2].replace(/\s/g, "");
  if (!data) return null;
  return { mediaType, data };
}
