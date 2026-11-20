import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Source } from "../../shared/schema.ts";
import type { DeskImage } from "../lib/images.ts";

type PhotoStageProps = {
  images: DeskImage[];
  heroId: string | null;
  source: Source | null;
  onHero: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (files: FileList) => void;
};

export function PhotoStage({ images, heroId, source, onHero, onRemove, onAdd }: PhotoStageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hot, setHot] = useState(false);
  const hero = images.find((image) => image.id === heroId) ?? images[0] ?? null;
  const region =
    hero && source?.type === "image" && source.imageId === hero.id ? source.region : null;

  function take(files: FileList | null) {
    if (files && files.length > 0) onAdd(files);
  }

  return (
    <section
      className="grid h-[300px] grid-cols-[minmax(0,1fr)_220px] gap-3"
      onDragEnter={(event) => {
        event.preventDefault();
        setHot(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setHot(true);
      }}
      onDragLeave={() => setHot(false)}
      onDrop={(event) => {
        event.preventDefault();
        setHot(false);
        take(event.dataTransfer.files);
      }}
    >
      <div
        className={`flex h-full min-h-0 items-center justify-center rounded-xl bg-card p-2 ring-1 ring-foreground/10 ${hot ? "ring-2 ring-primary" : ""}`}
        data-testid="hero-frame"
      >
        {hero ? (
          <div className="relative h-full max-w-full" style={{ aspectRatio: "1200 / 780" }}>
            <img
              src={hero.dataUrl}
              alt={`${hero.name}, hand-authored sample whiteboard`}
              className="h-full w-full rounded-lg bg-[#f4efe4]"
              data-testid="hero-image"
            />
            {region ? (
              <div
                className="source-box"
                style={{
                  left: `${region.x * 100}%`,
                  top: `${region.y * 100}%`,
                  width: `${region.w * 100}%`,
                  height: `${region.h * 100}%`,
                }}
                data-testid="source-region"
              >
                <span>Source region</span>
              </div>
            ) : null}
            {source?.type === "image" && source.imageId === hero.id && !region ? (
              <span className="absolute left-2 top-2 rounded bg-[#9f1239] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                Linked image, no region
              </span>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-foreground/20 text-sm text-muted-foreground"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="size-5" />
            Drop whiteboard photos, or load a sample fixture
          </button>
        )}
      </div>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-auto">
        {images.map((image) => {
          const active = image.id === hero?.id;
          return (
            <div key={image.id} className="relative" data-testid={`photo-${image.id}`}>
              <button
                type="button"
                className={`block w-full overflow-hidden rounded-lg ring-1 ring-foreground/10 ${active ? "ring-2 ring-primary" : ""}`}
                onClick={() => onHero(image.id)}
              >
                <img
                  src={image.dataUrl}
                  alt=""
                  className="h-16 w-full object-cover object-left-top"
                />
              </button>
              <button
                type="button"
                className="absolute right-1 top-1 rounded bg-background/90 p-0.5"
                aria-label={`Remove ${image.name}`}
                onClick={() => onRemove(image.id)}
              >
                <X className="size-3.5" />
              </button>
              <p className="truncate text-[11px] text-muted-foreground">{image.name}</p>
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <ImagePlus />
          Drop or pick
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="sr-only"
          aria-label="Whiteboard photos"
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
    </section>
  );
}
