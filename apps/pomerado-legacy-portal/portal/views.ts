import { CATEGORIES, TERMS } from "./seed.ts";
import {
  formatMoney,
  type PublicInvoice,
  type StatusFilter,
  type Vendor,
  type VendorDraft,
} from "./data.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const CSS = `
body { margin: 0; background: #c0c0c0; color: #000; font-family: Tahoma, "MS Sans Serif", sans-serif; font-size: 13px; }
.banner { background: #000080; color: #fff; padding: 8px 12px; font-weight: bold; }
.layout { width: 100%; border-collapse: collapse; }
.nav { background: #d4d0c8; width: 160px; vertical-align: top; padding: 8px; }
.nav a { display: block; margin: 4px 0; color: #000080; }
.main { background: #fff; vertical-align: top; padding: 10px; }
table.grid { border-collapse: collapse; background: #fff; width: 100%; }
table.grid th, table.grid td { border: 1px solid #808080; padding: 3px 6px; text-align: left; }
table.grid th { background: #d4d0c8; }
.error { color: #c00; font-weight: bold; }
.hint { color: #333; }
button, input, select { font-family: Tahoma, "MS Sans Serif", sans-serif; font-size: 13px; }
`;

function shell(title: string, body: string, signedIn: boolean): string {
  const nav = signedIn
    ? `<table class="nav"><tr><td>
        <a href="/app/main.asp">Home</a>
        <a href="/app/invoices.asp">Invoices</a>
        <a href="/app/vendors.asp">Vendors</a>
        <a href="/app/vendor_new.asp">Add Vendor</a>
        <a href="/app/logoff.asp">Log off</a>
      </td></tr></table>`
    : `<p class="hint">Sign in to continue.</p>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="banner">ACME CORP — Accounts Payable Portal</div>
<table class="layout"><tr>
<td class="nav">${nav}</td>
<td class="main">${body}</td>
</tr></table>
</body>
</html>`;
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export function loginPage(error: string | undefined, username: string, password: string): Response {
  const errorHtml = error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : "";
  const body = `
    <h1>Sign in</h1>
    ${errorHtml}
    <p class="hint">demo credentials: <strong>${escapeHtml(username)}</strong> / <strong>${escapeHtml(password)}</strong></p>
    <form method="post" action="/login">
      <p><label for="username">Username</label><br>
        <input id="username" name="username" autocomplete="username" autocorrect="off" autocapitalize="off" spellcheck="false" required></p>
      <p><label for="password">Password</label><br>
        <input id="password" name="password" type="password" autocomplete="current-password" required></p>
      <p><button type="submit">Sign in</button></p>
    </form>`;
  return html(shell("Sign in", body, false), error ? 401 : 200);
}

export function mainPage(): Response {
  const body = `<h1>Main</h1><p>Select a function from the menu. Invoice status OVERDUE is calculated when you press Go.</p>`;
  return html(shell("Main", body, true));
}

function statusOptions(filter: StatusFilter): string {
  const options: { value: string; filter: StatusFilter; label: string }[] = [
    { value: "", filter: "all", label: "All" },
    { value: "Open", filter: "open", label: "Open" },
    { value: "Paid", filter: "paid", label: "Paid" },
    { value: "OVERDUE", filter: "overdue", label: "OVERDUE" },
  ];
  return options
    .map(
      (option) =>
        `<option value="${option.value}"${option.filter === filter ? " selected" : ""}>${option.label}</option>`,
    )
    .join("");
}

export function invoicesPage(
  rows: readonly PublicInvoice[],
  filter: StatusFilter,
  page: number,
  pages: number,
): Response {
  const queryStatus =
    filter === "all" ? "" : filter === "overdue" ? "OVERDUE" : filter === "open" ? "Open" : "Paid";
  const bodyRows =
    rows.length === 0
      ? `<tr><td colspan="6">No invoices.</td></tr>`
      : rows
          .map(
            (row) => `<tr>
            <td>${escapeHtml(row.invoiceNumber)}</td>
            <td>${escapeHtml(row.vendor)}</td>
            <td>${escapeHtml(row.po)}</td>
            <td>${escapeHtml(formatMoney(row.amount))}</td>
            <td>${escapeHtml(row.due)}</td>
            <td>${escapeHtml(row.status)}</td>
          </tr>`,
          )
          .join("");
  const prev =
    page > 1
      ? `<a href="/app/invoices.asp?status=${encodeURIComponent(queryStatus)}&amp;page=${page - 1}">&lt;&lt; Prev</a>`
      : "";
  const next =
    page < pages
      ? `<a href="/app/invoices.asp?status=${encodeURIComponent(queryStatus)}&amp;page=${page + 1}">Next &gt;&gt;</a>`
      : "";
  const body = `
    <h1>Invoices</h1>
    <form method="get" action="/app/invoices.asp">
      <label for="status">Status</label>
      <select id="status" name="status">${statusOptions(filter)}</select>
      <button type="submit">Go</button>
    </form>
    <table class="grid">
      <thead><tr><th>Invoice #</th><th>Vendor</th><th>PO</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <p>Page ${page} of ${pages} ${prev} ${next}</p>`;
  return html(shell("Invoices", body, true));
}

export function vendorsPage(vendors: readonly Vendor[]): Response {
  const rows = vendors
    .map(
      (vendor) => `<tr>
        <td>${escapeHtml(vendor.id)}</td>
        <td>${escapeHtml(vendor.name)}</td>
        <td>${escapeHtml(vendor.email)}</td>
        <td>${escapeHtml(vendor.category)}</td>
        <td>${escapeHtml(vendor.terms)}</td>
      </tr>`,
    )
    .join("");
  const body = `
    <h1>Vendors</h1>
    <table class="grid">
      <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Category</th><th>Terms</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return html(shell("Vendors", body, true));
}

export function vendorForm(draft: VendorDraft, errors: readonly string[]): Response {
  const errorHtml =
    errors.length > 0
      ? `<div class="error" role="alert">${errors.map((error) => `<p>${escapeHtml(error)}</p>`).join("")}</div>`
      : "";
  const categories = CATEGORIES.map(
    (category) =>
      `<option value="${escapeHtml(category)}"${draft.category === category ? " selected" : ""}>${escapeHtml(category)}</option>`,
  ).join("");
  const terms = TERMS.map(
    (terms) =>
      `<label><input type="radio" name="terms" value="${escapeHtml(terms)}"${draft.terms === terms ? " checked" : ""} required> ${escapeHtml(terms)}</label>`,
  ).join(" ");
  const body = `
    <h1>Add Vendor</h1>
    ${errorHtml}
    <form method="post" action="/app/vendor_new.asp">
      <p><label for="name">Name</label><br><input id="name" name="name" value="${escapeHtml(draft.name)}" required></p>
      <p><label for="email">Email</label><br><input id="email" name="email" type="email" autocomplete="email" value="${escapeHtml(draft.email)}" required></p>
      <p><label for="category">Category</label><br>
        <select id="category" name="category" required>
          <option value="">Select</option>
          ${categories}
        </select>
      </p>
      <fieldset>
        <legend>Payment terms</legend>
        ${terms}
      </fieldset>
      <p><label><input type="checkbox" name="certified" value="yes"${draft.certified ? " checked" : ""}> I certify this vendor is approved</label></p>
      <p><button type="submit">Submit vendor</button></p>
    </form>`;
  return html(shell("Add Vendor", body, true));
}

export function confirmVendorPage(draft: VendorDraft): Response {
  const body = `
    <h1>Confirm vendor creation</h1>
    <p>Create <strong>${escapeHtml(draft.name)}</strong> (${escapeHtml(draft.email)}), ${escapeHtml(draft.category)}, ${escapeHtml(draft.terms)}?</p>
    <form method="post" action="/app/vendor_confirm.asp">
      <input type="hidden" name="name" value="${escapeHtml(draft.name)}">
      <input type="hidden" name="email" value="${escapeHtml(draft.email)}">
      <input type="hidden" name="category" value="${escapeHtml(draft.category)}">
      <input type="hidden" name="terms" value="${escapeHtml(draft.terms)}">
      <input type="hidden" name="certified" value="yes">
      <button type="submit">Confirm vendor creation</button>
    </form>`;
  return html(shell("Confirm vendor creation", body, true));
}

export function vendorCreatedPage(vendor: Vendor): Response {
  const body = `<h1>Vendor ${escapeHtml(vendor.id)} created</h1><p><a href="/app/vendors.asp">Back to vendors</a></p>`;
  return html(shell("Vendor created", body, true));
}
