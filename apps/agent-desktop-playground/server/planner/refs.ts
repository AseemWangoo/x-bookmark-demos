import { asRecord } from "../envelope.ts"
import type { RefQuery } from "./steps.ts"

export type A11yNode = {
  role?: string
  name?: string
  ref_id?: string
  value?: string
  available_actions?: string[]
  children?: A11yNode[]
}

export type FoundRef = {
  ok: true
  ref: string
  snapshotId: string
}

export type MissingRef = {
  ok: false
  code: "not_found"
  message: string
}

const qualifiedRef = /^@[A-Za-z0-9]+:e\d+$/

export function findRef(
  tree: A11yNode,
  snapshotId: string,
  query: RefQuery,
): FoundRef | MissingRef {
  const matches: string[] = []
  walk(tree, (node) => {
    if (query.role && node.role !== query.role) return
    if (query.name !== undefined && node.name !== query.name) return
    if (query.action) {
      const actions = node.available_actions ?? []
      if (!actions.includes(query.action)) return
    }
    const ref = qualifyRef(node.ref_id, snapshotId)
    if (ref) matches.push(ref)
  })
  if (matches.length === 0) {
    const name = query.name ? ` named "${query.name}"` : ""
    const action = query.action ? ` with ${query.action}` : ""
    return {
      ok: false,
      code: "not_found",
      message: `No ${query.role}${name}${action} in snapshot ${snapshotId}`,
    }
  }
  if (matches.length > 1) {
    return {
      ok: false,
      code: "not_found",
      message: `Ambiguous ${query.role} in snapshot ${snapshotId} (${matches.length} matches)`,
    }
  }
  const ref = matches[0]
  if (!ref || !qualifiedRef.test(ref)) {
    return {
      ok: false,
      code: "not_found",
      message: `Ref in snapshot ${snapshotId} was not qualified`,
    }
  }
  return { ok: true, ref, snapshotId }
}

export function qualifyRef(refId: string | undefined, snapshotId: string): string | null {
  if (!refId) return null
  if (qualifiedRef.test(refId)) return refId
  if (/^@e\d+$/.test(refId)) return `@${snapshotId}:${refId.slice(1)}`
  if (/^e\d+$/.test(refId)) return `@${snapshotId}:${refId}`
  return null
}

export function treeFromEnvelope(data: unknown): { tree: A11yNode; snapshotId: string } | null {
  const record = asRecord(data)
  if (!record) return null
  const snapshotId = record.snapshot_id
  const tree = asNode(record.tree)
  if (typeof snapshotId !== "string" || !tree) return null
  return { tree, snapshotId }
}

export function asNode(value: unknown): A11yNode | null {
  const record = asRecord(value)
  if (!record) return null
  const children = Array.isArray(record.children)
    ? record.children.flatMap((child) => {
        const node = asNode(child)
        return node ? [node] : []
      })
    : undefined
  const actions = Array.isArray(record.available_actions)
    ? record.available_actions.filter((entry): entry is string => typeof entry === "string")
    : undefined
  return {
    role: typeof record.role === "string" ? record.role : undefined,
    name: typeof record.name === "string" ? record.name : undefined,
    ref_id: typeof record.ref_id === "string" ? record.ref_id : undefined,
    value: typeof record.value === "string" ? record.value : undefined,
    available_actions: actions,
    children,
  }
}

function walk(node: A11yNode, visit: (node: A11yNode) => void): void {
  visit(node)
  for (const child of node.children ?? []) walk(child, visit)
}

export function nodeByRef(node: A11yNode, ref: string): A11yNode | null {
  if (node.ref_id === ref) return node
  for (const child of node.children ?? []) {
    const found = nodeByRef(child, ref)
    if (found) return found
  }
  return null
}
