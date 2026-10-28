export interface VendorInput {
  name: string;
  email: string;
  category: string;
  terms: string;
}

export type Route =
  | {
      kind: "call";
      integration: "list_invoices";
      input: { status?: string; vendor?: string };
    }
  | { kind: "call"; integration: "list_vendors"; input: Record<string, never> }
  | { kind: "needs-confirm"; integration: "add_vendor"; input: VendorInput }
  | { kind: "help"; message: string };

export const HELP =
  "I can list invoices (overdue, open, paid, or all, optionally from a vendor), list vendors, or add a vendor. Adding a vendor waits for confirmation and does not run from the message alone.";

export function routeText(text: string): Route {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  if (trimmed === "") return { kind: "help", message: HELP };

  if (/\badd\b/.test(lower) && /\bvendor\b/.test(lower)) {
    return { kind: "needs-confirm", integration: "add_vendor", input: parseVendor(trimmed) };
  }

  if (/\bvendors?\b/.test(lower) && !/\binvoices?\b/.test(lower)) {
    return { kind: "call", integration: "list_vendors", input: {} };
  }

  if (/\binvoices?\b/.test(lower) || /\boverdue\b/.test(lower) || /\bpaid\b/.test(lower)) {
    const status = matchStatus(lower);
    const vendor = matchVendor(trimmed);
    const input: { status?: string; vendor?: string } = {};
    if (status) input.status = status;
    if (vendor) input.vendor = vendor;
    return { kind: "call", integration: "list_invoices", input };
  }

  return { kind: "help", message: HELP };
}

function matchStatus(lower: string): string | undefined {
  if (lower.includes("overdue")) return "overdue";
  if (/\bopen\b/.test(lower)) return "open";
  if (/\bpaid\b/.test(lower)) return "paid";
  if (/\ball\b/.test(lower)) return "all";
  return undefined;
}

function matchVendor(text: string): string | undefined {
  const match = /\bfrom\s+(.+)$/i.exec(text.trim());
  if (!match) return undefined;
  const vendor = match[1].replace(/[?.!]+$/, "").trim();
  return vendor === "" ? undefined : vendor;
}

function parseVendor(text: string): VendorInput {
  const rest = text.replace(/^add(?:\s+a)?(?:\s+new)?\s+vendor\s*/i, "");
  const parts = rest.split(",").map((part) => part.trim()).filter((part) => part !== "");
  return {
    name: parts[0] ?? "",
    email: parts[1] ?? "",
    category: parts[2] ?? "",
    terms: normalizeTerms(parts[3] ?? ""),
  };
}

function normalizeTerms(value: string): string {
  const match = /net\s*(15|30|60)/i.exec(value);
  if (!match) return value;
  return `Net ${match[1]}`;
}
