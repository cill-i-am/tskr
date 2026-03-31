import { defineConfig } from "@playwright/test"

const requireEnv = (name: string) => {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} must be set before running Playwright.`)
  }

  return value
}

export default defineConfig({
  fullyParallel: false,
  outputDir: ".tmp/playwright/results",
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: "playwright-report",
      },
    ],
  ],
  testDir: "./apps/web/e2e/specs",
  timeout: 60_000,
  use: {
    baseURL: requireEnv("E2E_WEB_BASE_URL"),
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  workers: 1,
})
