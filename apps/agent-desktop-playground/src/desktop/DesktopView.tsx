import { useEffect, useState } from "react"

export function DesktopView({ app, src }: { app: string | null; src: string | null }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    setBroken(false)
  }, [src])
  return (
    <section className="flex min-h-0 flex-col" data-testid="desktop-pane">
      <div className="border-b px-3 py-2">
        <h2 className="text-xs font-medium tracking-wide uppercase">Desktop</h2>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/40 p-2">
        {src && !broken ? (
          <img
            key={src}
            data-testid="desktop-image"
            alt={app ? `${app} window` : "Desktop capture"}
            src={src}
            className="max-h-full max-w-full rounded-md bg-background object-contain shadow-sm"
            onError={() => setBroken(true)}
          />
        ) : (
          <p className="px-3 text-center text-xs text-muted-foreground">
            {app ? "No capture yet for this app." : "A window capture shows up after a step."}
          </p>
        )}
      </div>
    </section>
  )
}
