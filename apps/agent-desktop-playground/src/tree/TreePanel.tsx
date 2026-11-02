import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SnapshotView } from "@/lib/types"
import { TreeNode } from "./TreeNode"

export function TreePanel({
  snapshot,
  loading,
  error,
  filter,
  onFilter,
  usedRefs,
  focusedRef,
  onFocusRef,
}: {
  snapshot: SnapshotView | null
  loading: boolean
  error: string | null
  filter: string
  onFilter: (value: string) => void
  usedRefs: string[]
  focusedRef: string | null
  onFocusRef: (ref: string) => void
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col border-r" data-testid="tree">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <h2 className="text-xs font-medium tracking-wide uppercase">Tree</h2>
        {snapshot ? (
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            {snapshot.snapshotId} · {snapshot.refCount ?? "?"} refs · {snapshot.complete ? "complete" : "partial"}
          </span>
        ) : null}
        <Input
          value={filter}
          onChange={(event) => onFilter(event.target.value)}
          placeholder="Filter role, name, ref"
          className="ml-auto h-7 max-w-52 text-xs"
          data-testid="tree-filter"
          aria-label="Filter the accessibility tree"
        />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {loading ? <p className="px-2 py-3 text-xs text-muted-foreground">Taking a snapshot…</p> : null}
          {error ? <p className="px-2 py-3 text-xs text-destructive">{error}</p> : null}
          {!loading && !error && !snapshot ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">Select an app to read its accessibility tree.</p>
          ) : null}
          {snapshot ? (
            <TreeNode
              node={snapshot.tree}
              depth={0}
              filter={filter}
              usedRefs={usedRefs}
              focusedRef={focusedRef}
              onFocusRef={onFocusRef}
            />
          ) : null}
        </div>
      </ScrollArea>
    </section>
  )
}
