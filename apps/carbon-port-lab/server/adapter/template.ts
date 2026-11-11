import type { Effort } from "../../shared/port.ts";
import { effortLabel } from "../../shared/port.ts";
import { escapeHtml } from "../html.ts";

const LATENCY_MS: Record<Effort, number> = {
  low: 420,
  medium: 860,
  high: 1400,
};

export function templateLatency(effort: Effort): number {
  return LATENCY_MS[effort];
}

export function templateHtml(source: string, effort: Effort): string {
  const label = effortLabel(effort);
  const preview = escapeHtml(source.slice(0, 4000));
  const palette = paletteFor(effort);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Recorded mock template · ${label}</title>
<style>
  html, body { height: 100%; margin: 0; }
  body { display: flex; flex-direction: column; background: ${palette.bg}; color: ${palette.fg}; font: 14px/1.4 ui-monospace, monospace; }
  header { padding: 10px 12px; }
  h1 { font-size: 14px; margin: 0; font-weight: 600; }
  p { margin: 4px 0 0; opacity: 0.8; }
  canvas { flex: 1; width: 100%; min-height: 0; display: block; }
</style>
</head>
<body data-effort="${effort}" data-mock-template="true">
<header>
  <h1>${label} · recorded mock template</h1>
  <p>Not a Gemini 4 Carbon port. No gateway call was made.</p>
</header>
<canvas id="tape"></canvas>
<script>
const source = ${embedJs(source.slice(0, 4000))};
const effort = ${embedJs(effort)};
const canvas = document.getElementById("tape");
const ctx = canvas.getContext("2d");
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}
function ready() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width < 2 || height < 2) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const nextW = Math.max(1, Math.floor(width * dpr));
  const nextH = Math.max(1, Math.floor(height * dpr));
  if (canvas.width !== nextW || canvas.height !== nextH) resize();
  return true;
}
const lines = source.split(/\\n/).slice(0, 18);
let tick = 0;
function frame() {
  if (!ready()) {
    requestAnimationFrame(frame);
    return;
  }
  const { width, height } = { width: canvas.clientWidth, height: canvas.clientHeight };
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = ${JSON.stringify(palette.ink)};
  ctx.font = effort === "high" ? "13px ui-monospace, monospace" : "12px ui-monospace, monospace";
  lines.forEach((line, index) => {
    const y = 28 + index * 18 - (effort === "low" ? (tick % 40) : 0);
    ctx.globalAlpha = effort === "high" ? 0.95 : 0.75;
    ctx.fillText(line.slice(0, 80), 16, y);
  });
  ctx.globalAlpha = 1;
  if (effort !== "low") {
    const scan = (tick * (effort === "high" ? 2.2 : 1.2)) % Math.max(height, 1);
    ctx.fillStyle = ${JSON.stringify(palette.scan)};
    ctx.fillRect(0, scan, width, effort === "high" ? 18 : 8);
  }
  tick += 1;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
</script>
<pre hidden>${preview}</pre>
</body>
</html>`;
}

function embedJs(value: string): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function paletteFor(effort: Effort): { bg: string; fg: string; ink: string; scan: string } {
  switch (effort) {
    case "low":
      return { bg: "#d9d4cc", fg: "#1c1a17", ink: "#1c1a17", scan: "rgba(0,0,0,0.08)" };
    case "medium":
      return { bg: "#1c2430", fg: "#d5deea", ink: "#d5deea", scan: "rgba(120,170,220,0.18)" };
    case "high":
      return { bg: "#14110e", fg: "#f3e6c8", ink: "#f3e6c8", scan: "rgba(243,230,200,0.16)" };
    default: {
      const unreachable: never = effort;
      return unreachable;
    }
  }
}
