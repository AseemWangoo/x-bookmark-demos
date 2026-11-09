import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EXAMPLES } from "../../shared/duel.ts";

export type SketchFile = {
  name: string;
  dataUrl: string;
};

export function PromptBar({
  prompt,
  sketch,
  running,
  onPrompt,
  onSketch,
  onSubmit,
}: {
  prompt: string;
  sketch: SketchFile | null;
  running: boolean;
  onPrompt: (value: string) => void;
  onSketch: (sketch: SketchFile | null) => void;
  onSubmit: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function chooseFile(file: File | undefined): void {
    if (!file) return;
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      setFileError("PNG or JPEG only.");
      onSketch(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl.startsWith("data:image/png") && !dataUrl.startsWith("data:image/jpeg")) {
        setFileError("Could not read that image.");
        onSketch(null);
        return;
      }
      setFileError(null);
      onSketch({ name: file.name, dataUrl });
    };
    reader.readAsDataURL(file);
  }

  return (
    <form
      className="flex shrink-0 flex-col gap-3 border-b px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <Button
            key={example}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPrompt(example)}
          >
            {example}
          </Button>
        ))}
      </div>
      <Textarea
        value={prompt}
        aria-label="UI brief"
        placeholder="Describe the UI to generate twice"
        className="min-h-20"
        onChange={(event) => onPrompt(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg"
          aria-label="Sketch upload"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
          {sketch ? "Replace sketch" : "Upload sketch"}
        </Button>
        {sketch ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <img src={sketch.dataUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
            {sketch.name}
            <Button type="button" variant="ghost" size="sm" onClick={() => onSketch(null)}>
              Remove
            </Button>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Optional PNG or JPEG. Sent as a data URI, not a remote URL.</span>
        )}
        <Button type="submit" className="ms-auto" disabled={running || prompt.trim().length === 0} data-testid="generate">
          {running ? "Generating duel…" : "Generate duel"}
        </Button>
      </div>
      {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}
    </form>
  );
}
