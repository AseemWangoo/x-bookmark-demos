const MAX_BYTES = 10 * 1024 * 1024
const MAX_SIDE = 2048
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

export interface PreparedImage {
  imageDataUrl: string
  objectUrl: string
  width: number
  height: number
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Choose a PNG, JPEG, or WEBP image.")
  }
  if (file.size > MAX_BYTES) throw new Error("Image must be 10 MB or smaller.")

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is not available.")
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return {
    imageDataUrl: canvas.toDataURL("image/jpeg", 0.92),
    objectUrl: URL.createObjectURL(file),
    width,
    height,
  }
}
