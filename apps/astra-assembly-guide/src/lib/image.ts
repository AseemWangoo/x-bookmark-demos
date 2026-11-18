const MAX_SIDE = 2048;
const MAX_BYTES = 10 * 1024 * 1024;

export async function prepareImage(file: File): Promise<string> {
  if (file.type !== "image/png" && file.type !== "image/jpeg" && file.type !== "image/webp") {
    throw new Error("Use a PNG, JPEG, or WebP photo.");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not read that photo.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const dataUrl = canvas.toDataURL(file.type, 0.86);
  const payload = dataUrl.split(",")[1] ?? "";
  const bytes = Math.floor((payload.length * 3) / 4);
  if (bytes > MAX_BYTES) throw new Error("Photo is over 10 MB after resize.");
  return dataUrl;
}
