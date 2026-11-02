import { useEffect, useRef } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { A11yNode } from "@/lib/types"

export function TreeNode({
  node,
  depth,
  filter,
  usedRefs,
  focusedRef,
  onFocusRef,
}: {
  node: A11yNode
  depth: number
  filter: string
  usedRefs: string[]
  focusedRef: string | null
  onFocusRef: (ref: string) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const visible = nodeVisible(node, filter)
  const children = node.children ?? []
  const ref = node.ref_id
  const focused = ref !== undefined && ref === focusedRef
  const used = ref !== undefined && usedRefs.includes(ref)
  useEffect(() => {
    if (focused) rowRef.current?.scrollIntoView({ block: "nearest" })
  }, [focused])
  if (!visible) return null
  const row = (
    <div
      data-testid="tree-node"
      data-ref={ref}
      ref={rowRef}
      data-highlighted={focused || used ? "true" : "false"}
      className={`flex items-start gap-1 rounded px-1 py-0.5 text-[11px] leading-4 ${focused ? "bg-primary/15 ring-1 ring-primary" : used ? "bg-accent" : ""}`}
      style={{ marginLeft: depth * 8 }}
    >
      <span className="font-medium text-foreground">{node.role ?? "node"}</span>
      {node.name ? <span className="truncate text-muted-foreground">{node.name}</span> : null}
      {ref ? (
        <button
          type="button"
          data-testid="tree-ref"
          data-ref={ref}
          className="rounded bg-muted px-1 font-mono text-[10px] text-foreground"
          onClick={() => onFocusRef(ref)}
        >
          {ref}
        </button>
      ) : null}
      {node.available_actions && node.available_actions.length > 0 ? (
        <span className="truncate text-[10px] text-muted-foreground">{node.available_actions.join(", ")}</span>
      ) : null}
    </div>
  )
  if (children.length === 0) return row
  return (
    <Collapsible defaultOpen>
      <div className="flex items-start">
        <CollapsibleTrigger className="mt-0.5 size-4 shrink-0 text-[10px] text-muted-foreground">▾</CollapsibleTrigger>
        <div className="min-w-0 flex-1">{row}</div>
      </div>
      <CollapsibleContent>
        {children.map((child, index) => (
          <TreeNode
            key={`${child.ref_id ?? child.role ?? "n"}-${index}`}
            node={child}
            depth={depth + 1}
            filter={filter}
            usedRefs={usedRefs}
            focusedRef={focusedRef}
            onFocusRef={onFocusRef}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function nodeVisible(node: A11yNode, filter: string): boolean {
  if (!filter.trim()) return true
  const needle = filter.trim().toLowerCase()
  if (matches(node, needle)) return true
  return (node.children ?? []).some((child) => nodeVisible(child, filter))
}

function matches(node: A11yNode, needle: string): boolean {
  return [node.role, node.name, node.ref_id].some((value) => value?.toLowerCase().includes(needle))
}
