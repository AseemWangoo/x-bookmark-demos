import type { VendorInput } from "./router.ts";

export async function createVendorOnPortal(
  portal: string,
  input: VendorInput,
  creds: { username: string; password: string },
): Promise<{ id: string } | { error: string }> {
  const loginBody = new URLSearchParams({ username: creds.username, password: creds.password });
  let login: Response;
  try {
    login = await fetch(new URL("/login", portal), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: loginBody,
      redirect: "manual",
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "portal unreachable" };
  }
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) return { error: "portal login failed" };

  const fields = new URLSearchParams({
    name: input.name,
    email: input.email,
    category: input.category,
    terms: input.terms,
    certified: "yes",
  });
  const draft = await fetch(new URL("/app/vendor_new.asp", portal), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie },
    body: fields,
  });
  const draftHtml = await draft.text();
  if (!draftHtml.includes("Confirm vendor creation")) {
    return { error: "portal did not show the confirm step" };
  }
  const created = await fetch(new URL("/app/vendor_confirm.asp", portal), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie },
    body: fields,
  });
  const createdHtml = await created.text();
  const match = /Vendor (V-\d+) created/.exec(createdHtml);
  if (!match) return { error: "portal did not create the vendor" };
  return { id: match[1] };
}

export async function resetPortalHttp(portal: string): Promise<void> {
  const response = await fetch(new URL("/__reset", portal), { method: "POST" });
  if (!response.ok) throw new Error(`portal reset failed (${response.status})`);
}
