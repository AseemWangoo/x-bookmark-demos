import type { MetaView } from "../../shared/types.ts"

export function ModeBanner({ meta }: { meta: MetaView | null }) {
  const version = meta?.psychoscript ?? "0.2.1"
  const bun = meta ? `Bun ${meta.bun}` : "Bun ≥ 1.4"
  return (
    <p className="border-b px-4 py-2 text-sm text-muted-foreground" data-testid="mode-banner">
      psychoscript@{version} · {bun} · mock tools only · MIT · snapshots are build-specific
      {meta?.demo ? " · DEMO=1" : ""}
    </p>
  )
}
