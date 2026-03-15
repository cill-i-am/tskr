import { spawn } from "node:child_process"
import { access, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "../..")

const APP_URL = "http://127.0.0.1:4173"
const BUTTON_MARKER_TEXT = "TSDOWN propagation verified"
export const BUTTON_MARKER_ATTRIBUTE = "data-ui-propagation-marker"

const BUTTON_FILE = join(repoRoot, "packages/ui/src/components/button.tsx")
const CHROME_EXECUTABLE_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

export const injectButtonVerificationMarker = (source, markerText) => {
  if (source.includes(BUTTON_MARKER_ATTRIBUTE)) {
    throw new Error("Button source already contains the verification marker")
  }

  const target = /(<ButtonPrimitive[\s\S]*?\{\.\.\.props\}\n)\s*\/>(\n\))/

  if (!target.test(source)) {
    throw new Error("Could not find the button primitive render block")
  }

  return source.replace(
    target,
    `$1  >\n      {props.children}\n      <span ${BUTTON_MARKER_ATTRIBUTE} className="ml-2 inline-flex rounded bg-amber-200 px-1 py-0.5 text-[10px] font-semibold text-black">${markerText}</span>\n    </ButtonPrimitive>$2`
  )
}

const spawnProcess = (command, args, options) => {
  const child = spawn(command, args, {
    ...options,
    stdio: ["ignore", "pipe", "pipe"],
  })

  let output = ""

  child.stdout?.on("data", (chunk) => {
    output += chunk
  })

  child.stderr?.on("data", (chunk) => {
    output += chunk
  })

  child.on("error", (error) => {
    output += `\n${error.message}`
  })

  return {
    child,
    getOutput: () => output,
  }
}

const waitForUrl = async (url, timeoutMs) => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)

      if (response.ok) {
        return
      }
    } catch {
      // Server not ready yet.
    }

    await delay(250)
  }

  throw new Error(`Timed out waiting for ${url}`)
}

const waitForMarker = async (page, timeoutMs) => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    await page.reload({ waitUntil: "networkidle" })

    const marker = page.locator(`[${BUTTON_MARKER_ATTRIBUTE}]`)
    const markerCount = await marker.count()

    if (markerCount > 0) {
      return marker
    }

    await delay(500)
  }

  throw new Error(`Timed out waiting for ${BUTTON_MARKER_ATTRIBUTE}`)
}

const stopProcess = async (child) => {
  if (!child || child.exitCode !== null || child.killed) {
    return
  }

  child.kill("SIGTERM")

  const deadline = Date.now() + 5000

  while (child.exitCode === null && Date.now() < deadline) {
    await delay(100)
  }

  if (child.exitCode === null) {
    child.kill("SIGKILL")
  }
}

const ensureChromeExists = async () => {
  try {
    await access(CHROME_EXECUTABLE_PATH)
  } catch {
    throw new Error(`Chrome executable not found at ${CHROME_EXECUTABLE_PATH}`)
  }
}

export const verifyUiPropagation = async () => {
  const { chromium } = await import("playwright-core")

  await ensureChromeExists()

  const uiWatch = spawnProcess("pnpm", ["dev"], {
    cwd: join(repoRoot, "packages/ui"),
    env: process.env,
  })
  const webDev = spawnProcess(
    "pnpm",
    [
      "exec",
      "vite",
      "dev",
      "--host",
      "127.0.0.1",
      "--port",
      "4173",
      "--strictPort",
    ],
    {
      cwd: join(repoRoot, "apps/web"),
      env: process.env,
    }
  )

  let browser
  let page
  const originalButtonSource = await readFile(BUTTON_FILE, "utf8")

  try {
    await waitForUrl(APP_URL, 60_000)

    browser = await chromium.launch({
      executablePath: CHROME_EXECUTABLE_PATH,
      headless: true,
    })
    page = await browser.newPage()

    await page.goto(APP_URL, { waitUntil: "networkidle" })
    await page
      .getByRole("button", { name: "Button" })
      .waitFor({ timeout: 30_000 })

    const updatedButtonSource = injectButtonVerificationMarker(
      originalButtonSource,
      BUTTON_MARKER_TEXT
    )

    await writeFile(BUTTON_FILE, updatedButtonSource)

    const marker = await waitForMarker(page, 30_000)

    const markerText = await marker.textContent()

    if (markerText !== BUTTON_MARKER_TEXT) {
      throw new Error(`Unexpected marker text: ${markerText ?? "<missing>"}`)
    }
  } finally {
    await writeFile(BUTTON_FILE, originalButtonSource)

    if (page) {
      try {
        await page.locator(`[${BUTTON_MARKER_ATTRIBUTE}]`).waitFor({
          state: "detached",
          timeout: 30_000,
        })
      } catch {
        // Marker removal is best-effort during cleanup.
      }
    }

    await browser?.close()
    await stopProcess(webDev.child)
    await stopProcess(uiWatch.child)
  }

  return {
    appUrl: APP_URL,
    buttonFile: BUTTON_FILE,
    watchOutput: uiWatch.getOutput(),
    webOutput: webDev.getOutput(),
  }
}
