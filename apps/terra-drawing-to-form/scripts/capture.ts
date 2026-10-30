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

let server: ReturnType<typeof Bun.spawn> | null = null
try {
  await fetch(baseUrl)
} catch {
  server = Bun.spawn(["bun", "run", "dev"], {
    cwd: root,
    env: { ...Bun.env, MOCK: "1", MOCK_SPEED: "2" },
    stdout: "inherit",
    stderr: "inherit",
  })
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await fetch(baseUrl)
      break
    } catch {
      await Bun.sleep(250)
    }
  }
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: videoDir,
    size: { width: 1280, height: 800 },
  },
})
const page = await context.newPage()
const video = page.video()

await page.goto(baseUrl, { waitUntil: "networkidle" })
await page.locator('[data-sample-id="bracket-drawing"]').click()
await page.getByText("Export JSON").waitFor()
await page.waitForTimeout(600)

for (const key of ["part_no", "overall_length", "hole_diameter"]) {
  await page.locator(`[data-field-key="${key}"]`).hover()
  await page.waitForTimeout(500)
}
await page.locator('[data-field-key="part_no"]').hover()
await page.locator(".workspace").evaluate((element) => {
  element.scrollIntoView({ block: "start" })
  window.scrollBy(0, -82)
})
await page.screenshot({
  path: path.join(mediaDir, "screenshot.png"),
})

await page.locator('[data-box-key="overall_length"]').click()
await page.locator("#input-overall_length").fill("625")
await page.waitForTimeout(650)

await page.locator('[data-sample-id="service-request-form"]').click()
await page.getByText("Export JSON").waitFor()
await page.getByTestId("sort-toggle").click()
await page.waitForTimeout(900)

await page.locator('[data-sample-id="motor-spec-sheet"]').click()
await page.getByText("Export JSON").waitFor()
await page.getByTestId("export-download").click()
await page.getByText("Typed JSON").waitFor()
await page.waitForTimeout(900)
await page.getByLabel("Close export").click()

await page.locator('input[type="file"]').first().setInputFiles(
  path.join(root, "public/samples/motor-spec-sheet.png"),
)
await page.getByText(/Live mode needed to read your own image/).waitFor()
await page.waitForTimeout(1100)

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
server?.kill()
console.log("captured media/screenshot.png and media/demo.mp4")
