import addVendorFixture from "../fixtures/replay/add_vendor.json" with { type: "json" };
import allInvoicesFixture from "../fixtures/replay/list_invoices.all.json" with { type: "json" };
import openAcmeFixture from "../fixtures/replay/list_invoices.open-acme.json" with { type: "json" };
import overdueFixture from "../fixtures/replay/list_invoices.overdue.json" with { type: "json" };
import paidFixture from "../fixtures/replay/list_invoices.paid.json" with { type: "json" };
import vendorsFixture from "../fixtures/replay/list_vendors.json" with { type: "json" };
import type { CallResult } from "../src/lib/types.ts";
import { newIdempotencyKey } from "./jobs.ts";
import type { VendorInput } from "./router.ts";
import { replayFixture, type ReplayFixture } from "./schema.ts";

function loadFixtures(): ReplayFixture[] {
  return [
    overdueFixture,
    openAcmeFixture,
    paidFixture,
    allInvoicesFixture,
    vendorsFixture,
    addVendorFixture,
  ].map((fixture) => replayFixture.parse(fixture));
}

const fixtures = loadFixtures();

interface AddedVendor extends VendorInput {
  id: string;
  key: string;
}

const added: AddedVendor[] = [];
const seenCold = new Set<string>();

export function resetReplay(): void {
  added.length = 0;
  seenCold.clear();
}

export function replayFixtures(): readonly ReplayFixture[] {
  return fixtures;
}

export function replayRecordedAt(): string | null {
  return fixtures.find((fixture) => fixture.recordedAt)?.recordedAt ?? null;
}

export function replayIsSynthetic(): boolean {
  return fixtures.every((fixture) => fixture.synthetic);
}

interface InvoiceRow {
  invoiceNumber: string;
  vendor: string;
  po: string;
  amount: number;
  due: string;
  status: string;
}

interface VendorRow {
  id: string;
  name: string;
  email: string;
  category: string;
  terms: string;
}

function allInvoices(): InvoiceRow[] {
  const fixture = fixtures.find((item) => item.integration === "list_invoices" && item.input.status === "all");
  const output = fixture?.output as { invoices?: InvoiceRow[] } | undefined;
  return output?.invoices ?? [];
}

function seedVendors(): VendorRow[] {
  const fixture = fixtures.find((item) => item.integration === "list_vendors");
  const output = fixture?.output as { vendors?: VendorRow[] } | undefined;
  return output?.vendors ?? [];
}

function timingFor(integration: string, input: Record<string, unknown>): Pick<ReplayFixture, "coldMs" | "warmMs" | "recordedAt" | "synthetic" | "trail"> {
  const exact = fixtures.find(
    (fixture) => fixture.integration === integration && JSON.stringify(fixture.input) === JSON.stringify(input),
  );
  const fallback = fixtures.find((fixture) => fixture.integration === integration) ?? fixtures[0];
  const chosen = exact ?? fallback;
  if (!chosen) {
    return { coldMs: 0, warmMs: 0, recordedAt: null, synthetic: true, trail: ["replay"] };
  }
  return chosen;
}

function resultFrom(
  integration: string,
  args: { input: unknown; idempotency_key?: string },
  output: unknown,
  inputKey: Record<string, unknown>,
): CallResult {
  const timing = timingFor(integration, inputKey);
  const cold = !seenCold.has(integration);
  seenCold.add(integration);
  return {
    integration,
    arguments: args,
    trail: timing.trail,
    output,
    possibleCommit: false,
    ms: cold ? timing.coldMs : timing.warmMs,
    cold,
    coldMs: timing.coldMs,
    warmMs: timing.warmMs,
    latencyLabel: "recorded",
    synthetic: timing.synthetic,
    recordedAt: timing.recordedAt,
  };
}

export function replayListInvoices(input: { status?: string; vendor?: string }): CallResult {
  const status = (input.status ?? "all").toLowerCase();
  const vendor = input.vendor?.toLowerCase();
  const invoices = allInvoices().filter((row) => {
    const statusOk = status === "all" || row.status.toLowerCase() === status;
    const vendorOk = !vendor || row.vendor.toLowerCase().includes(vendor);
    return statusOk && vendorOk;
  });
  const key = vendor ? { status, vendor: input.vendor } : { status };
  if (input.vendor && input.status) {
    return resultFrom("list_invoices", { input }, { invoices }, { status: input.status, vendor: input.vendor });
  }
  return resultFrom("list_invoices", { input }, { invoices }, key);
}

export function replayListVendors(): CallResult {
  const vendors = [
    ...seedVendors(),
    ...added.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      category: vendor.category,
      terms: vendor.terms,
    })),
  ];
  return resultFrom("list_vendors", { input: {} }, { vendors }, {});
}

export function replayAddVendor(
  input: VendorInput,
  idempotencyKey = newIdempotencyKey(),
  id?: string,
): CallResult {
  const existing = added.find((vendor) => vendor.key === idempotencyKey);
  const vendor =
    existing ??
    (() => {
      const created: AddedVendor = {
        ...input,
        id: id ?? `V-${1013 + added.length}`,
        key: idempotencyKey,
      };
      added.push(created);
      return created;
    })();
  const output = {
    vendorId: vendor.id,
    name: vendor.name,
    email: vendor.email,
    category: vendor.category,
    terms: vendor.terms,
  };
  return resultFrom(
    "add_vendor",
    { input, idempotency_key: idempotencyKey },
    output,
    {
      name: "Globex Supply",
      email: "ap@globex.example",
      category: "Hardware",
      terms: "Net 30",
    },
  );
}
