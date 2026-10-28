import { portalCreds, portalPort, portalToday } from "../server/env.ts";
import {
  addVendor,
  createPortalState,
  filterInvoices,
  isLoopback,
  paginate,
  parseStatusFilter,
  resetPortalState,
  validateVendorDraft,
  type PortalState,
  type VendorDraft,
} from "./data.ts";
import {
  confirmVendorPage,
  invoicesPage,
  loginPage,
  mainPage,
  vendorCreatedPage,
  vendorForm,
  vendorsPage,
} from "./views.ts";

export interface PortalContext {
  state: PortalState;
  remoteAddress: string | null;
  today: string;
  username: string;
  password: string;
}

function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function signedIn(request: Request, state: PortalState): boolean {
  const id = cookieValue(request.headers.get("cookie"), "PORTALSESSID");
  return id !== null && state.sessions.has(id);
}

function redirect(location: string, cookie?: string): Response {
  const headers = new Headers({ location });
  if (cookie) headers.set("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

async function readForm(request: Request): Promise<URLSearchParams> {
  return new URLSearchParams(await request.text());
}

function draftFrom(params: URLSearchParams): VendorDraft {
  return {
    name: params.get("name") ?? "",
    email: params.get("email") ?? "",
    category: params.get("category") ?? "",
    terms: params.get("terms") ?? "",
    certified: params.get("certified") === "yes",
  };
}

export function handlePortal(request: Request, ctx: PortalContext): Response | Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const authed = signedIn(request, ctx.state);

  if (path === "/__reset" && request.method === "POST") {
    if (!isLoopback(ctx.remoteAddress)) {
      return new Response("forbidden", { status: 403 });
    }
    resetPortalState(ctx.state);
    return new Response("reset", { status: 200 });
  }

  if (path === "/login" && request.method === "GET") {
    return loginPage(undefined, ctx.username, ctx.password);
  }

  if (path === "/login" && request.method === "POST") {
    return readForm(request).then((params) => {
      const username = params.get("username") ?? "";
      const password = params.get("password") ?? "";
      if (username !== ctx.username || password !== ctx.password) {
        return loginPage("Invalid username or password.", ctx.username, ctx.password);
      }
      const id = crypto.randomUUID();
      ctx.state.sessions.set(id, username);
      return redirect("/app/main.asp", `PORTALSESSID=${id}; HttpOnly; Path=/; SameSite=Lax`);
    });
  }

  if (path === "/app/logoff.asp") {
    const id = cookieValue(request.headers.get("cookie"), "PORTALSESSID");
    if (id) ctx.state.sessions.delete(id);
    return redirect("/login", "PORTALSESSID=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
  }

  if (!authed && path.startsWith("/app/")) {
    return redirect("/login");
  }

  if (path === "/app/main.asp" && request.method === "GET") return mainPage();

  if (path === "/app/invoices.asp" && request.method === "GET") {
    const filter = parseStatusFilter(url.searchParams.get("status"));
    const requested = Number(url.searchParams.get("page") ?? "1");
    const filtered = filterInvoices(ctx.state.invoices, filter, ctx.today);
    const page = paginate(filtered, Number.isFinite(requested) ? requested : 1);
    return invoicesPage(page.rows, filter, page.page, page.pages);
  }

  if (path === "/app/vendors.asp" && request.method === "GET") {
    return vendorsPage(ctx.state.vendors);
  }

  if (path === "/app/vendor_new.asp" && request.method === "GET") {
    return vendorForm({ name: "", email: "", category: "", terms: "", certified: false }, []);
  }

  if (path === "/app/vendor_new.asp" && request.method === "POST") {
    return readForm(request).then((params) => {
      const draft = draftFrom(params);
      const errors = validateVendorDraft(draft);
      if (errors.length > 0) return vendorForm(draft, errors);
      return confirmVendorPage(draft);
    });
  }

  if (path === "/app/vendor_confirm.asp" && request.method === "POST") {
    return readForm(request).then((params) => {
      const draft = draftFrom(params);
      const errors = validateVendorDraft(draft);
      if (errors.length > 0) return vendorForm(draft, errors);
      const vendor = addVendor(ctx.state, draft);
      return vendorCreatedPage(vendor);
    });
  }

  if (path === "/" ) return redirect("/login");
  return new Response("Not found", { status: 404 });
}

export function startPortal(state = createPortalState()): ReturnType<typeof Bun.serve> {
  const creds = portalCreds();
  const server = Bun.serve({
    port: portalPort(),
    hostname: "127.0.0.1",
    fetch(request, bunServer) {
      const address = bunServer.requestIP(request);
      return handlePortal(request, {
        state,
        remoteAddress: address?.address ?? null,
        today: portalToday(),
        username: creds.username,
        password: creds.password,
      });
    },
  });
  console.log(`legacy portal listening on ${server.port}`);
  return server;
}

if (import.meta.main) startPortal();
