import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FILE_ACCEPT } from "../lib/files.ts";

type DropZoneProps = {
  onFile: (file: File) => void;
  onSample: () => void;
  pending: boolean;
};

export function DropZone({ onFile, onSample, pending }: DropZoneProps) {
  const [hot, setHot] = useState(false);

  return (
    <div className="grid gap-3">
      <div
        className="drop-zone"
        data-hot={hot ? "true" : "false"}
        onDragOver={(event) => {
          event.preventDefault();
          setHot(true);
        }}
        onDragLeave={() => setHot(false)}
        onDrop={(event) => {
          event.preventDefault();
          setHot(false);
          const file = event.dataTransfer.files.item(0);
          if (file) onFile(file);
        }}
      >
        <span className="text-base font-medium">Drop a scanned page, a screenshot, or a PDF</span>
        <span className="text-sm text-muted-foreground">
          PNG, JPEG, WebP, or one PDF page. Files up to 15 MB. The page image sent to the desk is capped at 12 MB.
        </span>
        <label className="text-sm font-medium underline" htmlFor="page-file">
          Choose a file
        </label>
        <input
          id="page-file"
          type="file"
          accept={FILE_ACCEPT}
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.item(0);
            event.target.value = "";
            if (file) onFile(file);
          }}
        />
      </div>
      <div>
        <Button type="button" data-testid="load-sample" disabled={pending} onClick={onSample}>
          Load sample page
        </Button>
      </div>
    </div>
  );
}
