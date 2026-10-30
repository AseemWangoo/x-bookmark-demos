import { useEffect, useMemo, useState } from "react"
import { Braces, FlaskConical, LoaderCircle, Radio, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/sonner"

import { FormPanel } from "./form/FormPanel"
import { extract, getMode, getSamples, getTemplates } from "./lib/api"
import { buildExport, downloadJson } from "./lib/export"
import { prepareImage } from "./lib/image"
import type {
  EditableField,
  Effort,
  ExtractionResponse,
  FieldValue,
  FormTemplate,
  Sample,
  SourceImage,
} from "./lib/types"
import { RunPanel } from "./run/RunPanel"
import { DropZone } from "./upload/DropZone"
import { SamplePicker } from "./upload/SamplePicker"
import { ImageViewer } from "./viewer/ImageViewer"

export default function App() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [serverMode, setServerMode] = useState<"mock" | "live">("mock")
  const [model, setModel] = useState("gpt-6.1-terra")
  const [forceMock, setForceMock] = useState(false)
  const [source, setSource] = useState<SourceImage | null>(null)
  const [templateId, setTemplateId] = useState("bracket-drawing")
  const [extraction, setExtraction] = useState<ExtractionResponse | null>(null)
  const [fields, setFields] = useState<EditableField[]>([])
  const [extractedAt, setExtractedAt] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const [reviewSort, setReviewSort] = useState(false)
  const [effort, setEffort] = useState<Effort>("medium")
  const [exportPreview, setExportPreview] = useState<string | null>(null)

  const mode = serverMode === "mock" || forceMock ? "mock" : "live"
  const template = templates.find((item) => item.id === templateId) ?? null

  useEffect(() => {
    Promise.all([getMode(), getSamples(), getTemplates()])
      .then(([modeResult, sampleResult, templateResult]) => {
        setServerMode(modeResult.mode)
        setModel(modeResult.model)
        setSamples(sampleResult)
        setTemplates(templateResult)
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Could not start app.")
      })
  }, [])

  const exported = useMemo(() => {
    if (!source || !template || !extraction || !extractedAt) return null
    return buildExport({ source, template, extraction, fields, extractedAt })
  }, [source, template, extraction, fields, extractedAt])

  async function runExtraction(nextSource: SourceImage, nextTemplateId: string) {
    setLoading(true)
    setMessage(null)
    setExtraction(null)
    setFields([])
    setReviewSort(false)
    try {
      const response = await extract({
        templateId: nextTemplateId,
        sampleId: nextSource.sampleId,
        imageDataUrl: nextSource.imageDataUrl,
        width: nextSource.width,
        height: nextSource.height,
        effort,
        forceMock,
      })
      setExtraction(response)
      setModel(response.model)
      setExtractedAt(new Date().toISOString())
      setFields(
        response.results.map((field) => ({
          ...field,
          modelValue: field.value,
          edited: false,
        })),
      )
    } catch (error) {
      const text = error instanceof Error ? error.message : "Extraction failed."
      setMessage(text)
      if (!text.startsWith("Live mode needed")) toast.error(text)
    } finally {
      setLoading(false)
    }
  }

  function selectSample(sample: Sample) {
    const nextSource: SourceImage = {
      name: sample.title,
      imageUrl: sample.imageUrl,
      width: sample.width,
      height: sample.height,
      sampleId: sample.id,
    }
    setSource(nextSource)
    setTemplateId(sample.templateId)
    setZoomed(false)
    void runExtraction(nextSource, sample.templateId)
  }

  async function uploadFile(file: File) {
    try {
      const prepared = await prepareImage(file)
      const nextSource: SourceImage = {
        name: file.name,
        imageUrl: prepared.imageDataUrl,
        imageDataUrl: prepared.imageDataUrl,
        width: prepared.width,
        height: prepared.height,
      }
      setSource(nextSource)
      setZoomed(false)
      void runExtraction(nextSource, templateId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read image.")
    }
  }

  function updateField(key: string, value: FieldValue) {
    setFields((current) =>
      current.map((field) =>
        field.key === key
          ? {
              ...field,
              value,
              edited: JSON.stringify(value) !== JSON.stringify(field.modelValue),
            }
          : field,
      ),
    )
  }

  function resetField(key: string) {
    setFields((current) =>
      current.map((field) =>
        field.key === key
          ? { ...field, value: field.modelValue, edited: false }
          : field,
      ),
    )
  }

  function selectBox(key: string) {
    setActiveKey(key)
    document.getElementById(`field-${key}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
    window.setTimeout(() => {
      document.getElementById(`input-${key}`)?.focus()
    }, 250)
  }

  function showExport(download: boolean) {
    if (!exported || !source) return
    const text = JSON.stringify(exported, null, 2)
    setExportPreview(text)
    if (download) downloadJson(source.name, exported)
  }

  async function copyExport() {
    if (!exported) return
    await navigator.clipboard.writeText(JSON.stringify(exported, null, 2))
    toast.success("JSON copied")
  }

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Terra Drawing-to-Form">
          <span><Braces /></span>
          <div><strong>Terra</strong><small>Drawing → Form</small></div>
        </a>
        <div className="header-status">
          <span className={`mode-badge mode-${mode}`}>
            {mode === "mock" ? <FlaskConical /> : <Radio />}
            {mode === "mock" ? "Mock: bundled samples" : "Live"}
          </span>
          {serverMode === "live" ? (
            <Button variant="outline" size="sm" onClick={() => setForceMock((value) => !value)}>
              {forceMock ? "Use live" : "Force mock"}
            </Button>
          ) : null}
        </div>
      </header>

      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">Visual reasoning · structured output</p>
            <h1>Turn technical documents into reviewable data.</h1>
            <p>
              Extract typed fields, trace every value to its source region, fix uncertainty,
              and export clean JSON.
            </p>
          </div>
          <DropZone compact onFile={uploadFile} />
        </section>

        {mode === "mock" ? (
          <div className="mock-banner">
            No API calls are made. Bundled samples replay hand-written synthetic responses;
            timing and token usage are illustrative.
          </div>
        ) : null}

        <SamplePicker
          samples={samples}
          activeId={source?.sampleId}
          onSelect={selectSample}
        />

        {!source ? (
          <section className="empty-state">
            <div className="empty-copy">
              <span>01</span>
              <h2>Start with a known document</h2>
              <p>Choose a sample above to inspect exact source regions, or bring your own image.</p>
            </div>
            <DropZone onFile={uploadFile} />
          </section>
        ) : (
          <>
            {!source.sampleId ? (
              <div className="template-row">
                <label htmlFor="template-picker">Template</label>
                <select
                  id="template-picker"
                  value={templateId}
                  onChange={(event) => {
                    const next = event.target.value
                    setTemplateId(next)
                    void runExtraction(source, next)
                  }}
                >
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {message ? <div className="live-required">{message}</div> : null}

            <div className="workspace">
              <ImageViewer
                source={source}
                fields={fields}
                activeKey={activeKey}
                zoomed={zoomed}
                onZoom={() => setZoomed((value) => !value)}
                onActive={setActiveKey}
                onSelect={selectBox}
              />
              {loading ? (
                <section className="form-shell loading-panel" aria-label="Extracting">
                  <div className="loading-title"><LoaderCircle /><span>Terra is reading the document…</span></div>
                  {Array.from({ length: 7 }, (_, index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))}
                </section>
              ) : template && fields.length ? (
                <FormPanel
                  template={template}
                  fields={fields}
                  activeKey={activeKey}
                  reviewSort={reviewSort}
                  onSort={() => setReviewSort((value) => !value)}
                  onActive={setActiveKey}
                  onChange={updateField}
                  onReset={resetField}
                  onDownload={() => showExport(true)}
                  onCopy={() => void copyExport()}
                />
              ) : (
                <section className="form-shell pending-panel">
                  <p>Structured fields will appear here.</p>
                </section>
              )}
            </div>
          </>
        )}

        <RunPanel
          extraction={extraction}
          mode={mode}
          model={model}
          effort={effort}
          onEffort={setEffort}
        />
      </main>

      {exportPreview ? (
        <div className="export-backdrop" role="dialog" aria-modal="true" aria-label="Exported JSON">
          <div className="export-modal">
            <div><p className="eyebrow">Export preview</p><h2>Typed JSON</h2></div>
            <Button variant="ghost" size="icon" onClick={() => setExportPreview(null)} aria-label="Close export"><X /></Button>
            <pre>{exportPreview}</pre>
          </div>
        </div>
      ) : null}
      <Toaster position="bottom-right" />
    </div>
  )
}
