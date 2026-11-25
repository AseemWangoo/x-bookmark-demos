import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MODEL_BADGE, MODEL_NOTE, SAMPLE_LABEL } from "../shared/copy.ts";
import type { ModePayload, TranscribeResult } from "../shared/types.ts";
import { DropZone } from "./desk/DropZone.tsx";
import { MarkdownPane } from "./desk/MarkdownPane.tsx";
import { MetricsStrip } from "./desk/MetricsStrip.tsx";
import { ModeBanner } from "./desk/ModeBanner.tsx";
import { SourcePane } from "./desk/SourcePane.tsx";
import { TableLens } from "./desk/TableGrid.tsx";
import { fetchMode, transcribe } from "./lib/api.ts";
import { blobToBase64, classifyFile, fileError, type ImageMime } from "./lib/files.ts";
import { openPdf, renderPdfPage, type RenderedPage } from "./lib/pdf.ts";

type Preview = {
  url: string;
  name: string;
  alt: string;
  width: number;
  height: number;
};

type PdfView = {
  page: number;
  count: number;
  note: string | null;
};

export default function App() {
  const [mode, setMode] = useState<ModePayload | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pdfView, setPdfView] = useState<PdfView | null>(null);
  const [result, setResult] = useState<TranscribeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const previewUrl = useRef<string | null>(null);
  const pdfRef = useRef<Awaited<ReturnType<typeof openPdf>> | null>(null);

  useEffect(() => {
    fetchMode()
      .then(setMode)
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : "Could not read the desk mode.";
        setError(message);
      });
    return () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      void pdfRef.current?.loadingTask.destroy();
    };
  }, []);

  function replacePreview(next: Preview) {
    if (previewUrl.current && previewUrl.current !== next.url) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = next.url;
    setPreview(next);
  }

  async function clearPdf() {
    const current = pdfRef.current;
    pdfRef.current = null;
    setPdfView(null);
    if (current) await current.loadingTask.destroy();
  }

  async function runImage(base64: string, mime: ImageMime, previewNext: Preview) {
    setPending(true);
    setError(null);
    setResult(null);
    replacePreview(previewNext);
    try {
      const next = await transcribe({ imageBase64: base64, mimeType: mime });
      setResult(next);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Transcription failed.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  async function showPdfPage(pdf: NonNullable<typeof pdfRef.current>, page: number, name: string) {
    const rendered: RenderedPage = await renderPdfPage(pdf, page);
    setPdfView({ page, count: pdf.numPages, note: rendered.note });
    await runImage(rendered.base64, "image/png", {
      url: rendered.previewUrl,
      name: `${name} · page ${page}`,
      alt: `Rendered page ${page} of ${name}`,
      width: rendered.width,
      height: rendered.height,
    });
  }

  async function loadSample() {
    setPending(true);
    setError(null);
    await clearPdf();
    try {
      const response = await fetch("/fixtures/page.png");
      if (!response.ok) throw new Error("The sample page is missing.");
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      const url = URL.createObjectURL(blob);
      const size = await measureImage(url);
      await runImage(base64, "image/png", {
        url,
        name: "Harbor & Pine Provisions — Dock 4 (sample)",
        alt: "Hand-authored Harbor and Pine receiving ticket. Not model output.",
        width: size.width,
        height: size.height,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not load the sample.";
      setError(message);
      toast.error(message);
      setPending(false);
    }
  }

  async function takeFile(file: File) {
    const decision = classifyFile(file);
    const problem = fileError(decision);
    if (problem || decision.kind === "empty" || decision.kind === "too-big" || decision.kind === "rejected") {
      setError(problem ?? "Use a PNG, JPEG, WebP, or PDF.");
      toast.error(problem ?? "Use a PNG, JPEG, WebP, or PDF.");
      return;
    }
    setError(null);
    await clearPdf();
    try {
      if (decision.kind === "pdf") {
        const pdf = await openPdf(await file.arrayBuffer());
        if (pdf.numPages < 1) throw new Error("That PDF has no pages.");
        pdfRef.current = pdf;
        await showPdfPage(pdf, 1, file.name);
        return;
      }
      const base64 = await blobToBase64(file);
      const url = URL.createObjectURL(file);
      const size = await measureImage(url);
      await runImage(base64, decision.mime, {
        url,
        name: file.name,
        alt: file.name,
        width: size.width,
        height: size.height,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not read that file.";
      setError(message);
      toast.error(message);
      setPending(false);
    }
  }

  async function changePage(page: number) {
    const pdf = pdfRef.current;
    if (!pdf || !preview) return;
    const name = preview.name.replace(/ · page \d+$/, "");
    try {
      await showPdfPage(pdf, page, name);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not render that page.";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">OCRia Table Lens</h1>
          <Tooltip>
            <TooltipTrigger className="rounded-full" aria-label={MODEL_NOTE}>
              <Badge>{MODEL_BADGE}</Badge>
            </TooltipTrigger>
            <TooltipContent>{MODEL_NOTE}</TooltipContent>
          </Tooltip>
          {mode ? (
            <Badge variant={mode.mode === "mock" ? "secondary" : "default"} data-testid="mode-badge">
              {mode.banner}
            </Badge>
          ) : null}
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          One page in, Markdown out. HTML tables become a sortable grid with CSV export. The sample page is {SAMPLE_LABEL}
        </p>
      </header>
      {mode ? <ModeBanner mode={mode} /> : null}
      <main id="desk" className="grid gap-6">
        <DropZone onFile={(file) => void takeFile(file)} onSample={() => void loadSample()} pending={pending} />
        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {preview ? (
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <SourcePane
              url={preview.url}
              name={preview.name}
              alt={preview.alt}
              width={preview.width}
              height={preview.height}
              pdf={pdfView}
              pending={pending}
              onPage={(page) => void changePage(page)}
            />
            {result ? (
              <MarkdownPane markdown={result.markdown} label={result.label} />
            ) : (
              <section aria-labelledby="markdown-heading">
                <h2 id="markdown-heading" className="text-base font-medium">
                  Markdown
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {pending ? "Reading the page…" : "No transcription for this page."}
                </p>
              </section>
            )}
          </div>
        ) : null}
        {result ? (
          <>
            <TableLens tables={result.tables} />
            <MetricsStrip result={result} />
          </>
        ) : null}
      </main>
      <footer className="text-xs text-muted-foreground">
        <a href="https://huggingface.co/llamaindex/OCRia-1/blob/main/LICENSE">OCRia-1 license</a>
        {" · "}
        <a href="https://ollama.com/llamaindex/ocria-1">Ollama card</a>
        {" · "}
        <a href="https://huggingface.co/llamaindex/OCRia-1">Hugging Face</a>
      </footer>
    </div>
  );
}

function measureImage(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Could not preview that image."));
    image.src = url;
  });
}
