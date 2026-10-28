import { expect, test } from "bun:test";
import { OVERDUE_IDS } from "../portal/seed.ts";
import { createPortalState } from "../portal/data.ts";
import { handlePortal } from "../portal/server.ts";
import { callIntegration, shutdownPool } from "../server/pomerado-client.ts";
import { appRoot } from "../server/http.ts";
import { detectMode } from "../server/env.ts";

const live = process.env.LIVE_LOCAL === "1";

test.skipIf(!live)("real integrations match the portal seed", async () => {
  const mode = await detectMode(appRoot, null);
  expect(mode.mode).toBe("local");
  const state = createPortalState();
  const server = Bun.serve({
    port: 4517,
    hostname: "127.0.0.1",
    fetch(request, bunServer) {
      return handlePortal(request, {
        state,
        remoteAddress: bunServer.requestIP(request)?.address ?? null,
        today: "2026-10-28",
        username: "clerk",
        password: "legacy123",
      });
    },
  });
  try {
    const overdue = await callIntegration(appRoot, "list_invoices", { status: "overdue" }, "read");
    const rows = (overdue.output as { invoices?: { invoiceNumber: string }[] }).invoices ?? [];
    expect(rows.map((row) => row.invoiceNumber).sort()).toEqual([...OVERDUE_IDS].sort());
    const created = await callIntegration(
      appRoot,
      "add_vendor",
      { name: "Globex Supply", email: "ap@globex.example", category: "Hardware", terms: "Net 30" },
      "write",
    );
    expect(created.arguments.idempotency_key).toMatch(/^[A-Za-z0-9_-]{1,200}$/);
    const vendors = await callIntegration(appRoot, "list_vendors", {}, "read");
    const names = JSON.stringify(vendors.output);
    expect(names).toContain("Globex Supply");
    await fetch(`http://127.0.0.1:${server.port}/__reset`, { method: "POST" });
  } finally {
    await shutdownPool();
    server.stop();
  }
});
