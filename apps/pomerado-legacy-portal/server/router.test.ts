import { expect, test } from "bun:test";
import { routeText } from "./router.ts";

test("example chips route to the expected calls", () => {
  expect(routeText("list overdue invoices")).toEqual({
    kind: "call",
    integration: "list_invoices",
    input: { status: "overdue" },
  });
  expect(routeText("show open invoices from Acme")).toEqual({
    kind: "call",
    integration: "list_invoices",
    input: { status: "open", vendor: "Acme" },
  });
  expect(routeText("list vendors")).toEqual({
    kind: "call",
    integration: "list_vendors",
    input: {},
  });
});

test("add vendor asks for confirmation and never calls", () => {
  const route = routeText("add a new vendor Globex Supply, ap@globex.example, Hardware, Net 30");
  expect(route.kind).toBe("needs-confirm");
  if (route.kind !== "needs-confirm") return;
  expect(route.integration).toBe("add_vendor");
  expect(route.input).toEqual({
    name: "Globex Supply",
    email: "ap@globex.example",
    category: "Hardware",
    terms: "Net 30",
  });
});

test("unknown text returns help", () => {
  const route = routeText("what is the weather in lisbon");
  expect(route.kind).toBe("help");
});
