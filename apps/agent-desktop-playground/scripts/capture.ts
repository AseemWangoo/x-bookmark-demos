import { mkdir, rm } from "node:fs/promises"
import path from "node:path"

import { chromium } from "playwright"

const root = path.resolve(import.meta.dirname, "..")
const mediaDir = path.join(root, "media")
const videoDir = path.join(mediaDir, ".playwright")
const baseUrl = "http://127.0.0.1:5173"

await mkdir(mediaDir, { recursive: true })
await rm(videoDir, { recursive: true, force: true })
await mkdir(videoDir, { recursive: true })

const env = { ...Bun.env, MODE: "replay", REPLAY_SPEED: "1", PORT: "8787" }
const api = Bun.spawn(["bun", "server/index.ts"], {
  cwd: root,
  env,
  stdout: "inherit",
  stderr: "inherit",
})
const web = Bun.spawn(["bun", "run", "dev:web"], {
  cwd: root,
  env,
  stdout: "inherit",
  stderr: "inherit",
})

try {
  await waitFor(baseUrl)
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
  })
  const page = await context.newPage()
  const video = page.video()
  await page.goto(baseUrl, { waitUntil: "networkidle" })
  await page.getByTestId("mode-badge").waitFor()
  await page.locator('[data-testid="app-row"][data-app="gnome-text-editor"]').click()
  await page.getByTestId("tree").locator("[data-ref]").first().waitFor()
  await page.waitForTimeout(600)
  await page.getByTestId("preset-todo").click()
  await page.getByTestId("run-button").click()
  const verify = page.locator('[data-testid="step-row"]', { hasText: "Verify the document contains the typed text" })
  await verify.waitFor({ timeout: 30_000 })
  await verify.scrollIntoViewIfNeeded()
  await verify.locator('[data-testid="ref-chip"]').click()
  await verify.locator('[data-testid="envelope-toggle"]').click()
  await page.getByTestId("desktop-image").waitFor({ timeout: 10_000 })
  await verify.scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(mediaDir, "screenshot.png") })
  await page.getByTestId("preset-calculator").click()
  await page.getByTestId("run-button").click()
  await page.getByText("Verify the display reads 84").waitFor({ timeout: 45_000 })
  await page.locator('[data-testid="step-row"]', { hasText: "Verify the display reads 84" }).scrollIntoViewIfNeeded()
  await page.waitForTimeout(1800)
  await context.close()
  await browser.close()
  const rawVideo = await video?.path()
  if (!rawVideo) throw new Error("Playwright did not produce a video.")
  const ffmpeg = Bun.spawn(
    [
      "ffmpeg",
      "-y",
      "-i",
      rawVideo,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      path.join(mediaDir, "demo.mp4"),
    ],
    { stdout: "inherit", stderr: "inherit" },
  )
  if ((await ffmpeg.exited) !== 0) throw new Error("ffmpeg conversion failed.")
  await rm(videoDir, { recursive: true, force: true })
  console.log("captured media/screenshot.png and media/demo.mp4")
} finally {
  api.kill()
  web.kill()
}

async function waitFor(url: string): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status === 404) return
    } catch {
      // server still booting
    }
    await Bun.sleep(250)
  }
  throw new Error(`timed out waiting for ${url}`)
}
