import { describe, expect, test } from "bun:test";
import {
  addVendor,
  createPortalState,
  filterInvoices,
  formatMoney,
  isLoopback,
  overdueIds,
  paginate,
  validateVendorDraft,
} from "./data.ts";
import { OVERDUE_IDS, PORTAL_TODAY_DEFAULT, seedInvoices } from "./seed.ts";
import { handlePortal, type PortalContext } from "./server.ts";

const TODAY = PORTAL_TODAY_DEFAULT;

function ctx(state = createPortalState(), remoteAddress = "127.0.0.1"): PortalContext {
  return {
    state,
    remoteAddress,
    today: TODAY,
    username: "clerk",
    password: "legacy123",
  };
}

async function send(context: PortalContext, path: string, init?: RequestInit): Promise<Response> {
  const request = new Request(`http://127.0.0.1:4517${path}`, init);
  return handlePortal(request, context);
}

async function signIn(context: PortalContext): Promise<string> {
  const response = await send(context, "/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "clerk", password: "legacy123" }),
  });
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("missing session");
  return cookie;
}

describe("portal data", () => {
  test("overdue ids match the seed and exclude a due date of today", () => {
    const ids = overdueIds(seedInvoices(), TODAY);
    expect(ids).toEqual([...OVERDUE_IDS]);
    expect(ids).toHaveLength(7);
    const dueToday = seedInvoices().find((invoice) => invoice.number === "INV-1015");
    expect(dueToday?.due).toBe(TODAY);
    expect(ids).not.toContain("INV-1015");
  });

  test("status filter and pagination", () => {
    const invoices = seedInvoices();
    const all = filterInvoices(invoices, "all", TODAY);
    expect(all).toHaveLength(34);
    const page1 = paginate(all, 1);
    expect(page1.rows.map((row) => row.invoiceNumber)).toEqual([
      "INV-1001",
      "INV-1002",
      "INV-1003",
      "INV-1004",
      "INV-1005",
      "INV-1006",
      "INV-1007",
      "INV-1008",
      "INV-1009",
      "INV-1010",
    ]);
    const page4 = paginate(all, 4);
    expect(page4.pages).toBe(4);
    expect(page4.rows.map((row) => row.invoiceNumber)).toEqual([
      "INV-1031",
      "INV-1032",
      "INV-1033",
      "INV-1034",
    ]);
    const overdue = filterInvoices(invoices, "overdue", TODAY);
    expect(overdue.map((row) => row.invoiceNumber)).toEqual([...OVERDUE_IDS]);
    const open = filterInvoices(invoices, "open", TODAY);
    expect(open.every((row) => row.status === "Open")).toBe(true);
    expect(open.some((row) => (OVERDUE_IDS as readonly string[]).includes(row.invoiceNumber))).toBe(false);
  });

  test("add vendor validates, confirms, then assigns V-1013", () => {
    const state = createPortalState();
    const draft = {
      name: "",
      email: "nope",
      category: "Hardware",
      terms: "Net 30",
      certified: false,
    };
    expect(validateVendorDraft(draft).length).toBeGreaterThan(0);
    const valid = {
      name: "Globex Supply",
      email: "ap@globex.example",
      category: "Hardware",
      terms: "Net 30",
      certified: true,
    };
    expect(validateVendorDraft(valid)).toEqual([]);
    const vendor = addVendor(state, valid);
    expect(vendor.id).toBe("V-1013");
    expect(state.vendors.at(-1)?.name).toBe("Globex Supply");
  });

  test("loopback check", () => {
    expect(isLoopback("127.0.0.1")).toBe(true);
    expect(isLoopback("::1")).toBe(true);
    expect(isLoopback("10.1.1.1")).toBe(false);
    expect(isLoopback(null)).toBe(false);
  });

  test("money format", () => {
    expect(formatMoney(1840.5)).toBe("$1,840.50");
  });
});

describe("portal routes", () => {
  test("signed-out requests redirect and a bad password is rejected", async () => {
    const context = ctx();
    const signedOut = await send(context, "/app/invoices.asp");
    expect(signedOut.status).toBe(302);
    expect(signedOut.headers.get("location")).toBe("/login");
    const bad = await send(context, "/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: "clerk", password: "wrong" }),
    });
    expect(await bad.text()).toContain("Invalid username or password");
    const login = await send(context, "/login");
    expect(await login.text()).toContain("legacy123");
  });

  test("invoices require Go and page", async () => {
    const context = ctx();
    const cookie = await signIn(context);
    const page = await send(context, "/app/invoices.asp?status=OVERDUE&page=1", {
      headers: { cookie },
    });
    const html = await page.text();
    expect(html).toContain(">Go<");
    for (const id of OVERDUE_IDS) expect(html).toContain(id);
    expect(html).not.toContain("INV-1002");
  });

  test("add vendor confirm interstitial then reset", async () => {
    const context = ctx();
    const cookie = await signIn(context);
    const body = new URLSearchParams({
      name: "Globex Supply",
      email: "ap@globex.example",
      category: "Hardware",
      terms: "Net 30",
      certified: "yes",
    });
    const draft = await send(context, "/app/vendor_new.asp", {
      method: "POST",
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    expect(await draft.text()).toContain("Confirm vendor creation");
    const created = await send(context, "/app/vendor_confirm.asp", {
      method: "POST",
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    expect(await created.text()).toContain("Vendor V-1013 created");
    const vendors = await send(context, "/app/vendors.asp", { headers: { cookie } });
    expect(await vendors.text()).toContain("Globex Supply");
    const deniedContext = ctx(context.state, "10.1.1.1");
    const forbidden = await send(deniedContext, "/__reset", { method: "POST" });
    expect(forbidden.status).toBe(403);
    expect(deniedContext.state.vendors.some((vendor) => vendor.name === "Globex Supply")).toBe(true);
    const reset = await send(context, "/__reset", { method: "POST" });
    expect(reset.status).toBe(200);
    expect(context.state.vendors.some((vendor) => vendor.name === "Globex Supply")).toBe(false);
    expect(context.state.vendors).toHaveLength(12);
  });
});
