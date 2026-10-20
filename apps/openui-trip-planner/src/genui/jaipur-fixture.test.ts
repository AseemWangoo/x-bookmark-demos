import { createParser } from "@openuidev/react-lang";
import { expect, test } from "bun:test";
import { jaipurOpenUI } from "./fixtures/jaipur.oui.ts";
import { library } from "./library.tsx";

test("Jaipur fixture parses with zero errors", () => {
  const parser = createParser(library.toJSONSchema(), library.root);
  const result = parser.parse(jaipurOpenUI);
  expect(result.meta.errors).toEqual([]);
  expect(result.root?.typeName).toBe("TripPlan");
});
