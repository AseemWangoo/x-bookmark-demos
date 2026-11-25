import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { MAX_PIXELS, PDF_DPI } from "../../shared/copy.ts";
import { blobToBase64 } from "./files.ts";

GlobalWorkerOptions.workerSrc = workerUrl;

const TARGET_SCALE = PDF_DPI / 72;

export type RenderedPage = {
  base64: string;
  previewUrl: string;
  width: number;
  height: number;
  note: string | null;
};

export async function openPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  try {
    return await getDocument({ data: new Uint8Array(data) }).promise;
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") throw new Error("That PDF needs a password. This desk does not unlock PDFs.");
    throw new Error("Could not open that PDF.");
  }
}

export async function renderPdfPage(pdf: PDFDocumentProxy, pageNumber: number): Promise<RenderedPage> {
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  let scale = TARGET_SCALE;
  let note: string | null = null;
  const pixels = base.width * scale * base.height * scale;
  if (pixels > MAX_PIXELS) {
    scale = Math.sqrt(MAX_PIXELS / (base.width * base.height));
    note = `This page is larger than 16.7 million pixels at 300 DPI, so it was rendered at ${Math.round(scale * 72)} DPI.`;
  }
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  await page.render({ canvas, viewport }).promise;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("Could not render that PDF page."));
    }, "image/png");
  });
  const base64 = await blobToBase64(blob);
  return {
    base64,
    previewUrl: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
    note,
  };
}
