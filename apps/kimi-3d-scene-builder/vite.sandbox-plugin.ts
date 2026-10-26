import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, type Plugin } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

// Opaque sandbox frames fetch module scripts as CORS from origin "null", which Vite's
// emitted `type="module"` chunk does not allow. Inline a classic IIFE and hash it.
// 'unsafe-eval' stays so the frame can run generated code with new Function.
const CSP_TAIL =
  "style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; worker-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";

export function inlineSandbox(): Plugin {
  let cache: { stamp: string; html: string } | null = null;

  async function render(): Promise<string> {
    const stamp = sandboxStamp();
    if (cache?.stamp === stamp) return cache.html;
    const result = await build({
      configFile: false,
      root,
      logLevel: "error",
      cacheDir: path.join(root, "node_modules/.tmp/sandbox-vite"),
      resolve: { alias: { "@": path.join(root, "src") } },
      build: {
        write: false,
        minify: true,
        target: "es2023",
        emptyOutDir: false,
        outDir: path.join(root, "node_modules/.tmp/sandbox-bundle"),
        rollupOptions: {
          input: path.join(root, "src/sandbox/runtime.ts"),
          output: { format: "iife", inlineDynamicImports: true, entryFileNames: "runtime.js" },
        },
      },
    });
    const output = Array.isArray(result) ? result[0] : result;
    if (!output || !("output" in output)) throw new Error("sandbox bundle missing");
    const chunk = output.output.find((item) => item.type === "chunk");
    if (!chunk || chunk.type !== "chunk") throw new Error("sandbox bundle missing");
    const code = chunk.code.includes("</script>") ? chunk.code.replaceAll("</script>", "<\\/script>") : chunk.code;
    const hash = createHash("sha256").update(code).digest("base64");
    const csp = `default-src 'none'; script-src 'sha256-${hash}' 'unsafe-eval'; ${CSP_TAIL}`;
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<title>Scene sandbox</title>
<style>html,body{margin:0;height:100%;background:#111;overflow:hidden}canvas{display:block}</style>
</head>
<body>
<script>${code}</script>
</body>
</html>
`;
    cache = { stamp, html };
    return html;
  }

  return {
    name: "inline-sandbox",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/sandbox.html") {
          next();
          return;
        }
        void render().then(
          (html) => {
            res.setHeader("content-type", "text/html; charset=utf-8");
            res.setHeader("cache-control", "no-store");
            res.end(html);
          },
          (error: unknown) => {
            res.statusCode = 500;
            res.end(error instanceof Error ? error.message : "sandbox build failed");
          },
        );
      });
    },
    async writeBundle(options) {
      const html = await render();
      const dir = options.dir ?? path.join(root, "dist");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "sandbox.html"), html);
    },
  };
}

function sandboxStamp(): string {
  const dir = path.join(root, "src/sandbox");
  return fs
    .readdirSync(dir)
    .sort()
    .map((name) => {
      const stat = fs.statSync(path.join(dir, name));
      return `${name}:${stat.mtimeMs}`;
    })
    .join("|");
}
