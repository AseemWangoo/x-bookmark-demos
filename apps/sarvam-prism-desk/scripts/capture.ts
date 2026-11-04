import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { PRESETS } from "../fixtures/presets";

const root = path.resolve(import.meta.dirname, "..");
const mediaDir = path.join(root, "media");
const videoDir = path.join(mediaDir, ".playwright");
const baseUrl = "http://127.0.0.1:5173";
const hinglish = PRESETS.find((preset) => preset.id === "upi")?.variants.hinglish;
if (!hinglish) throw new Error("missing hinglish preset");

await mkdir(mediaDir, { recursive: true });
await rm(videoDir, { recursive: true, force: true });
await mkdir(videoDir, { recursive: true });

const env = { ...Bun.env, MOCK_SPEED: "1" };
delete env.SARVAM_API_KEY;

let server: ReturnType<typeof Bun.spawn> | null = null;
const up = async () => {
  const response = await fetch(baseUrl);
  return response.ok;
};

if (!(await up().catch(() => false))) {
  server = Bun.spawn(["bun", "run", "dev"], {
    cwd: root,
    env,
    stdout: "inherit",
    stderr: "inherit",
  });
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await up().catch(() => false)) {
      ready = true;
      break;
    }
    await Bun.sleep(250);
  }
  if (!ready) throw new Error("dev server did not start");
}

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
const video = page.video();

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("mode-badge").getByText("Mock: synthetic fixtures").waitFor();
  await page.getByTestId("mock-banner").waitFor();
  await page.waitForTimeout(1600);

  const composer = page.getByTestId("composer");
  await composer.click();
  const chars = [...hinglish];
  for (let index = 0; index < chars.length; index += 1) {
    await page.keyboard.insertText(chars[index] ?? "");
    await page.waitForTimeout(60);
    if ((index + 1) % 12 === 0) await page.waitForTimeout(780);
  }
  await page.getByTestId("route-source").getByText("Synthetic fixture").waitFor();
  await page.waitForTimeout(400);

  for (const lang of ["hi", "ta", "bn", "en"]) {
    await page.getByTestId(`lang-${lang}`).click();
    await page.getByTestId(`lang-chip-${lang}`).waitFor();
    await page.waitForTimeout(700);
  }
  await page.getByTestId("lang-hinglish").click();
  await page.getByTestId("lang-chip-hinglish").waitFor();
  await page.getByTestId("composer").evaluate((element) => {
    if (element instanceof HTMLTextAreaElement) element.blur();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(mediaDir, "screenshot.png") });

  await page.getByTestId("preset-takeover").click();
  await page.getByTestId("verdict").getByText("Human review").waitFor();
  await page.getByTestId("escalate-verdict").getByText("yes").waitFor();
  await page.getByTestId("urgency-label").getByText("critical").waitFor();
  await page.waitForTimeout(1100);

  const slider = page.getByTestId("threshold");
  const box = await slider.boundingBox();
  if (!box) throw new Error("threshold slider is not visible");
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.08, box.y + box.height / 2, { steps: 18 });
  await page.mouse.up();
  await page.getByTestId("verdict").getByText("Auto-route").waitFor();
  await page.waitForTimeout(600);

  await page.getByTestId("raw-json").click();
  await page.getByTestId("raw-sheet").waitFor();
  await page.waitForTimeout(1200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  await page.getByTestId("latency-meter").hover();
  await page.waitForTimeout(1200);
  await page.getByTestId("open-weights").hover();
  await page.waitForTimeout(3600);
} finally {
  await context.close();
  await browser.close();
}

const rawVideo = await video?.path();
if (!rawVideo) throw new Error("Playwright did not produce a video.");
const output = path.join(mediaDir, "demo.mp4");
const ffmpeg = Bun.spawn(
  [
    "ffmpeg",
    "-y",
    "-i",
    rawVideo,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output,
  ],
  { stdout: "inherit", stderr: "inherit" },
);
if ((await ffmpeg.exited) !== 0) throw new Error("ffmpeg conversion failed.");
await rm(videoDir, { recursive: true, force: true });
server?.kill();

const probe = Bun.spawnSync([
  "ffprobe",
  "-v",
  "error",
  "-show_entries",
  "format=duration",
  "-of",
  "csv=p=0",
  output,
]);
const duration = Number(probe.stdout.toString().trim());
console.log(`captured media/screenshot.png and media/demo.mp4 (${duration.toFixed(2)}s)`);
if (!(duration >= 20 && duration <= 40)) {
  throw new Error(`demo.mp4 duration ${duration.toFixed(2)}s is outside 20–40s`);
}
