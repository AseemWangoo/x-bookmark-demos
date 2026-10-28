import type { Invoice, StoredStatus, Vendor } from "./data.ts";

export const PORTAL_TODAY_DEFAULT = "2026-10-28";

/** Open invoices whose due date is before PORTAL_TODAY_DEFAULT. */
export const OVERDUE_IDS = [
  "INV-1001",
  "INV-1004",
  "INV-1008",
  "INV-1012",
  "INV-1019",
  "INV-1025",
  "INV-1031",
] as const;

export const CATEGORIES = [
  "Hardware",
  "Office",
  "Facilities",
  "Logistics",
  "Software",
  "Retail",
  "Hospitality",
] as const;

export const TERMS = ["Net 15", "Net 30", "Net 60"] as const;

export function seedVendors(): Vendor[] {
  return [
    { id: "V-1001", name: "Acme Industrial", email: "ap@acme.example", category: "Hardware", terms: "Net 30" },
    { id: "V-1002", name: "Northwind Traders", email: "billing@northwind.example", category: "Office", terms: "Net 15" },
    { id: "V-1003", name: "Contoso Parts", email: "ap@contoso.example", category: "Hardware", terms: "Net 60" },
    { id: "V-1004", name: "Fabrikam Supply", email: "pay@fabrikam.example", category: "Facilities", terms: "Net 30" },
    { id: "V-1005", name: "Adventure Works", email: "ap@adventure.example", category: "Office", terms: "Net 30" },
    { id: "V-1006", name: "Wide World Importers", email: "accounts@wideworld.example", category: "Logistics", terms: "Net 15" },
    { id: "V-1007", name: "Litware Inc", email: "ap@litware.example", category: "Software", terms: "Net 60" },
    { id: "V-1008", name: "Tailspin Toys", email: "billing@tailspin.example", category: "Retail", terms: "Net 30" },
    { id: "V-1009", name: "Proseware", email: "ap@proseware.example", category: "Software", terms: "Net 15" },
    { id: "V-1010", name: "Coho Winery", email: "pay@coho.example", category: "Hospitality", terms: "Net 30" },
    { id: "V-1011", name: "Alpine Ski House", email: "ap@alpine.example", category: "Retail", terms: "Net 60" },
    { id: "V-1012", name: "Munson Pickles", email: "billing@munson.example", category: "Hospitality", terms: "Net 15" },
  ];
}

type Row = [number, string, StoredStatus, string, number];

const ROWS: readonly Row[] = [
  [1001, "Acme Industrial", "Open", "2026-09-01", 1840.5],
  [1002, "Acme Industrial", "Open", "2026-11-02", 2100],
  [1003, "Northwind Traders", "Open", "2026-11-20", 300],
  [1004, "Northwind Traders", "Open", "2026-09-15", 920],
  [1005, "Contoso Parts", "Open", "2026-12-15", 99.99],
  [1006, "Acme Industrial", "Open", "2026-12-01", 875.1],
  [1007, "Fabrikam Supply", "Open", "2027-01-05", 1200],
  [1008, "Contoso Parts", "Open", "2026-10-01", 410.25],
  [1009, "Adventure Works", "Open", "2026-11-11", 760],
  [1010, "Wide World Importers", "Open", "2026-11-30", 540],
  [1011, "Litware Inc", "Open", "2027-02-01", 88],
  [1012, "Fabrikam Supply", "Open", "2026-08-20", 2750],
  [1013, "Tailspin Toys", "Open", "2026-11-08", 640],
  [1014, "Proseware", "Open", "2026-12-20", 1500],
  [1015, "Acme Industrial", "Open", "2026-10-28", 430],
  [1016, "Coho Winery", "Open", "2026-11-01", 220],
  [1017, "Alpine Ski House", "Open", "2027-03-01", 990],
  [1018, "Munson Pickles", "Open", "2026-10-30", 45.5],
  [1019, "Adventure Works", "Open", "2026-10-15", 640],
  [1020, "Acme Industrial", "Paid", "2026-06-01", 500],
  [1021, "Northwind Traders", "Paid", "2026-05-12", 800],
  [1022, "Contoso Parts", "Paid", "2026-04-01", 120],
  [1023, "Fabrikam Supply", "Paid", "2026-09-01", 640],
  [1024, "Adventure Works", "Paid", "2026-01-15", 90],
  [1025, "Wide World Importers", "Open", "2026-07-30", 3188.4],
  [1026, "Wide World Importers", "Paid", "2026-08-08", 430],
  [1027, "Litware Inc", "Paid", "2026-10-01", 210],
  [1028, "Tailspin Toys", "Paid", "2026-03-03", 77],
  [1029, "Proseware", "Paid", "2026-02-02", 1000],
  [1030, "Coho Winery", "Paid", "2026-07-07", 333.33],
  [1031, "Litware Inc", "Open", "2026-10-27", 155],
  [1032, "Alpine Ski House", "Paid", "2026-10-20", 610],
  [1033, "Munson Pickles", "Paid", "2026-09-09", 250],
  [1034, "Acme Industrial", "Paid", "2026-11-15", 199],
];

export function seedInvoices(): Invoice[] {
  return ROWS.map(([number, vendor, storedStatus, due, amount]) => ({
    number: `INV-${number}`,
    vendor,
    po: `PO-${4000 + number}`,
    amount,
    due,
    storedStatus,
  }));
}
