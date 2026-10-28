import { CATEGORIES, TERMS, seedInvoices, seedVendors } from "./seed.ts";

export type Terms = (typeof TERMS)[number];
export type StoredStatus = "Open" | "Paid";
export type DisplayStatus = "Open" | "Paid" | "OVERDUE";
export type StatusFilter = "all" | "open" | "paid" | "overdue";

export interface Vendor {
  id: string;
  name: string;
  email: string;
  category: string;
  terms: Terms;
}

export interface Invoice {
  number: string;
  vendor: string;
  po: string;
  amount: number;
  due: string;
  storedStatus: StoredStatus;
}

export interface PublicInvoice {
  invoiceNumber: string;
  vendor: string;
  po: string;
  amount: number;
  due: string;
  status: DisplayStatus;
}

export interface VendorDraft {
  name: string;
  email: string;
  category: string;
  terms: string;
  certified: boolean;
}

export interface PortalState {
  vendors: Vendor[];
  invoices: Invoice[];
  sessions: Map<string, string>;
}

export const PAGE_SIZE = 10;

export function createPortalState(): PortalState {
  return {
    vendors: seedVendors().map((vendor) => ({ ...vendor })),
    invoices: seedInvoices().map((invoice) => ({ ...invoice })),
    sessions: new Map(),
  };
}

export function resetPortalState(state: PortalState): void {
  state.vendors = seedVendors().map((vendor) => ({ ...vendor }));
  state.invoices = seedInvoices().map((invoice) => ({ ...invoice }));
}

export function isOverdue(invoice: Invoice, today: string): boolean {
  return invoice.storedStatus === "Open" && invoice.due < today;
}

export function displayStatus(invoice: Invoice, today: string): DisplayStatus {
  if (isOverdue(invoice, today)) return "OVERDUE";
  return invoice.storedStatus;
}

export function projectInvoice(invoice: Invoice, today: string): PublicInvoice {
  return {
    invoiceNumber: invoice.number,
    vendor: invoice.vendor,
    po: invoice.po,
    amount: invoice.amount,
    due: invoice.due,
    status: displayStatus(invoice, today),
  };
}

export function parseStatusFilter(value: string | null): StatusFilter {
  switch ((value ?? "").trim().toLowerCase()) {
    case "":
    case "all":
      return "all";
    case "open":
      return "open";
    case "paid":
      return "paid";
    case "overdue":
      return "overdue";
    default:
      return "all";
  }
}

export function filterInvoices(
  invoices: readonly Invoice[],
  filter: StatusFilter,
  today: string,
): PublicInvoice[] {
  return invoices
    .map((invoice) => projectInvoice(invoice, today))
    .filter((invoice) => {
      switch (filter) {
        case "all":
          return true;
        case "open":
          return invoice.status === "Open";
        case "paid":
          return invoice.status === "Paid";
        case "overdue":
          return invoice.status === "OVERDUE";
        default: {
          const neverFilter: never = filter;
          return neverFilter;
        }
      }
    });
}

export function paginate<T>(rows: readonly T[], page: number): { page: number; pages: number; rows: T[] } {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * PAGE_SIZE;
  return { page: current, pages, rows: rows.slice(start, start + PAGE_SIZE) };
}

export function overdueIds(invoices: readonly Invoice[], today: string): string[] {
  return invoices.filter((invoice) => isOverdue(invoice, today)).map((invoice) => invoice.number);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateVendorDraft(draft: VendorDraft): string[] {
  const errors: string[] = [];
  if (draft.name.trim() === "") errors.push("Name is required.");
  if (!EMAIL.test(draft.email.trim())) errors.push("Email is required.");
  if (!CATEGORIES.includes(draft.category as (typeof CATEGORIES)[number])) {
    errors.push("Category is required.");
  }
  if (!TERMS.includes(draft.terms as Terms)) errors.push("Payment terms are required.");
  if (!draft.certified) errors.push("Certify that this vendor is approved.");
  return errors;
}

export function nextVendorId(vendors: readonly Vendor[]): string {
  const max = vendors.reduce((highest, vendor) => {
    const number = Number(vendor.id.slice(2));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 1000);
  return `V-${max + 1}`;
}

export function addVendor(state: PortalState, draft: VendorDraft): Vendor {
  const terms = draft.terms as Terms;
  const vendor: Vendor = {
    id: nextVendorId(state.vendors),
    name: draft.name.trim(),
    email: draft.email.trim(),
    category: draft.category,
    terms,
  };
  state.vendors.push(vendor);
  return vendor;
}

export function formatMoney(amount: number): string {
  const [whole, fraction] = amount.toFixed(2).split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${withCommas}.${fraction}`;
}

export function isLoopback(address: string | null): boolean {
  if (!address) return false;
  const host = address.replace(/^\[|\]$/g, "").split("%")[0];
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}
