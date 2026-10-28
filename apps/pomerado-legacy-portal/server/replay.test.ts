import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { OVERDUE_IDS, seedVendors } from "../portal/seed.ts";
import { replayFixture } from "./schema.ts";
import { replayAddVendor, replayFixtures, replayListInvoices, replayListVendors, resetReplay } from "./replay.ts";

const integrations = join(import.meta.dir, "../integrations");

test("replay fixtures validate and synthetic matches whether integrations exist", () => {
  const files = readdirSync(join(import.meta.dir, "../fixtures/replay")).filter((name) => name.endsWith(".json"));
  expect(files.length).toBeGreaterThan(0);
  const minted = existsSync(integrations);
  for (const file of files) {
    const fixture = replayFixture.parse(
      JSON.parse(readFileSync(join(import.meta.dir, "../fixtures/replay", file), "utf8")),
    );
    expect(fixture.synthetic).toBe(!minted);
  }
  expect(replayFixtures().every((fixture) => fixture.synthetic === !minted)).toBe(true);
});

test("overdue replay matches the seed and writes stay in memory until reset", () => {
  resetReplay();
  const overdue = replayListInvoices({ status: "overdue" });
  const invoices = (overdue.output as { invoices: { invoiceNumber: string }[] }).invoices;
  expect(invoices.map((row) => row.invoiceNumber)).toEqual([...OVERDUE_IDS]);
  const acme = replayListInvoices({ status: "open", vendor: "Acme" });
  const acmeRows = (acme.output as { invoices: { vendor: string; status: string }[] }).invoices;
  expect(acmeRows.length).toBeGreaterThan(0);
  expect(acmeRows.every((row) => row.vendor.includes("Acme") && row.status === "Open")).toBe(true);

  const before = replayListVendors();
  expect((before.output as { vendors: unknown[] }).vendors).toHaveLength(seedVendors().length);
  const created = replayAddVendor(
    { name: "Globex Supply", email: "ap@globex.example", category: "Hardware", terms: "Net 30" },
    "globex-once",
    "V-1013",
  );
  expect(created.arguments.idempotency_key).toBe("globex-once");
  const again = replayAddVendor(
    { name: "Globex Supply", email: "ap@globex.example", category: "Hardware", terms: "Net 30" },
    "globex-once",
    "V-1013",
  );
  expect((again.output as { vendorId: string }).vendorId).toBe("V-1013");
  const after = replayListVendors();
  expect((after.output as { vendors: { name: string }[] }).vendors.filter((row) => row.name === "Globex Supply")).toHaveLength(1);
  resetReplay();
  const cleared = replayListVendors();
  expect((cleared.output as { vendors: { name: string }[] }).vendors.some((row) => row.name === "Globex Supply")).toBe(false);
});
