import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AppRow } from "@/lib/types"

export function AppsPanel({
  apps,
  selected,
  loading,
  error,
  onSelect,
  onRefresh,
}: {
  apps: AppRow[]
  selected: string | null
  loading: boolean
  error: string | null
  onSelect: (name: string) => void
  onRefresh: () => void
}) {
  return (
    <section className="flex min-h-0 flex-col border-r">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="text-xs font-medium tracking-wide uppercase">Apps</h2>
        <Button size="xs" variant="outline" onClick={onRefresh} data-testid="refresh-apps">
          Refresh
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 p-2">
          {loading ? <p className="px-2 py-3 text-xs text-muted-foreground">Reading the desktop…</p> : null}
          {error ? <p className="px-2 py-3 text-xs text-destructive">{error}</p> : null}
          {!loading && !error && apps.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No apps in this session.</p>
          ) : null}
          {[...apps].sort(byPresentation).map((app) => {
            const active = app.name === selected
            return (
              <button
                key={app.name}
                type="button"
                data-testid="app-row"
                data-app={app.name}
                aria-pressed={active}
                onClick={() => onSelect(app.name)}
                className={`rounded-lg px-2 py-1.5 text-left text-xs ${active ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{label(app.name)}</span>
                  {app.presentation ? (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                      {app.presentation}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {app.name}
                  {app.pid ? ` · pid ${app.pid}` : ""}
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </section>
  )
}

function byPresentation(a: AppRow, b: AppRow): number {
  return rank(a) - rank(b)
}

function rank(app: AppRow): number {
  if (app.presentation === "foreground") return 0
  if (app.presentation === "background") return 2
  return 1
}

function label(name: string): string {
  if (name === "gnome-text-editor") return "Text Editor"
  if (name === "gnome-calculator") return "Calculator"
  return name
}
