import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { FieldSpec, Fixture, FixtureKind } from "../src/lib/types.ts";

const fixturesDir = join(import.meta.dir, "../fixtures");

const receiptFields: FieldSpec[] = [
  { name: "merchant", type: "text", instructions: "Store or restaurant name" },
  {
    name: "loyalty_id",
    type: "text",
    instructions: "Loyalty or rewards id printed on the receipt",
  },
  { name: "purchased_at", type: "datetime", instructions: "Purchase date and time" },
  { name: "items", type: "list", items: "text", instructions: "Item names, not prices" },
  { name: "subtotal", type: "number", decimals: 2, unit: "USD" },
  { name: "tax", type: "number", decimals: 2, unit: "USD" },
  { name: "tip", type: "number", decimals: 2, unit: "USD" },
  { name: "total", type: "number", decimals: 2, unit: "USD", instructions: "Amount charged" },
  { name: "card_last4", type: "text", instructions: "Last four digits of the card" },
];

const invoiceFields: FieldSpec[] = [
  { name: "invoice_number", type: "text" },
  { name: "vendor", type: "text", instructions: "Supplier name" },
  { name: "issued", type: "date", instructions: "Issue date" },
  {
    name: "due_date",
    type: "date",
    instructions: "Issue date plus the net payment days",
  },
  {
    name: "total",
    type: "number",
    decimals: 2,
    unit: "USD",
    instructions: "Amount due including shipping",
  },
  { name: "line_items", type: "list", items: "text", instructions: "Line item names" },
  { name: "contacts", type: "list", items: "text" },
  { name: "po_number", type: "text", instructions: "Purchase order number" },
];

const emailFields: FieldSpec[] = [
  { name: "order_id", type: "text", instructions: "Order number" },
  { name: "delivered_on", type: "date", instructions: "Delivery date" },
  {
    name: "amount_paid",
    type: "number",
    decimals: 2,
    unit: "USD",
    instructions: "Total paid including tax",
  },
  {
    name: "days_since_delivery",
    type: "duration",
    unit: "days",
    integer: true,
    instructions: "Days from delivery to the date the customer wrote",
  },
  {
    name: "damage",
    type: "list",
    items: "text",
    instructions: "Each kind of damage described",
  },
  { name: "tracking_number", type: "text" },
];

const bankFields: FieldSpec[] = [
  {
    name: "payees",
    type: "list",
    items: "text",
    instructions: "Payee name on each transaction, not the processor prefix or city",
  },
  {
    name: "canonical_payee",
    type: "text",
    instructions: "Clean merchant name for the first debit",
  },
  { name: "check_number", type: "text", instructions: "Check number if a check was written" },
  {
    name: "debit_total",
    type: "number",
    decimals: 2,
    unit: "USD",
    instructions: "Sum of the debit amounts, excluding incoming wires",
  },
];

const catalog: Array<{
  id: string;
  kind: FixtureKind;
  title: string;
  blurb: string;
  file: string;
  presetFields: FieldSpec[];
}> = [
  {
    id: "receipt-coffee",
    kind: "receipt",
    title: "Coffee receipt",
    blurb: "Cafe receipt. Loyalty id is absent.",
    file: "receipt-coffee.txt",
    presetFields: receiptFields,
  },
  {
    id: "invoice-northwind",
    kind: "invoice",
    title: "Northwind invoice",
    blurb: "Docs example INV-2291, extended with line items.",
    file: "invoice-northwind.txt",
    presetFields: invoiceFields,
  },
  {
    id: "email-damaged-order",
    kind: "email",
    title: "Damaged-order email",
    blurb: "Support email from the Clairic launch post.",
    file: "email-damaged-order.txt",
    presetFields: emailFields,
  },
  {
    id: "bank-transactions-messy",
    kind: "bank",
    title: "Messy bank transactions",
    blurb: "Processor descriptors. Payee names are the weak spot.",
    file: "bank-transactions-messy.txt",
    presetFields: bankFields,
  },
];

export function listFixtures(): Fixture[] {
  return catalog.map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    title: entry.title,
    blurb: entry.blurb,
    source: readFileSync(join(fixturesDir, entry.file), "utf8"),
    presetFields: entry.presetFields.map((field) => ({ ...field })),
  }));
}

export function fixtureById(id: string): Fixture | undefined {
  return listFixtures().find((fixture) => fixture.id === id);
}
