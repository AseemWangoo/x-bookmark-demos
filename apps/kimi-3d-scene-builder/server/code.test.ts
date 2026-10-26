import { expect, test } from "bun:test";
import { extractCode } from "./code.ts";

test("extractCode takes the last js or javascript fence", () => {
  const content = [
    "draft",
    "```js",
    "const old = 1;",
    "```",
    "```javascript",
    "const THREE = kit.THREE;",
    "kit.setSky('#000', '#111');",
    "```",
    "done",
  ].join("\n");
  const result = extractCode(content);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.code).toContain("kit.setSky");
  expect(result.code).not.toContain("const old");
});

test("extractCode rejects an empty fence and prose", () => {
  expect(extractCode("```js\n```").ok).toBe(false);
  expect(extractCode("```js\n   \n```")).toEqual({ ok: false, message: "no code returned" });
  const prose = extractCode("I would build a lighthouse with warm light and gentle water.");
  expect(prose).toEqual({ ok: false, message: "no code returned" });
});

test("extractCode keeps fence-less code and strips export default", () => {
  const bare = extractCode("const THREE = kit.THREE;\nkit.scene.add(new THREE.Mesh());");
  expect(bare.ok).toBe(true);
  if (!bare.ok) return;
  expect(bare.code).toContain("kit.scene.add");

  const wrapped = extractCode(
    ["```js", "export default function build(kit) {", "  const THREE = kit.THREE;", "  kit.setSky('#111', '#222');", "}", "```"].join(
      "\n",
    ),
  );
  expect(wrapped.ok).toBe(true);
  if (!wrapped.ok) return;
  expect(wrapped.code).not.toContain("export default");
  expect(wrapped.code).toContain("kit.setSky");
  expect(wrapped.code).not.toContain("function build");
});
