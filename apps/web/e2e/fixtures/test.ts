/* oxlint-disable import/no-relative-parent-imports, no-empty-pattern */

import { test as base, expect } from "@playwright/test"

import { e2eConfig } from "../support/config"
import { createE2eSeedHelpers } from "../support/database"
import { clearEmailCaptures } from "../support/email-capture"

interface WorkerFixtures {
  authBaseUrl: string
  emailCaptureDir: string
  seed: ReturnType<typeof createE2eSeedHelpers>
  webBaseUrl: string
}

const test = base.extend<Record<never, never>, WorkerFixtures>({
  authBaseUrl: [
    async ({}, runFixture) => {
      await runFixture(e2eConfig.authBaseUrl)
    },
    {
      scope: "worker",
    },
  ],
  emailCaptureDir: [
    async ({}, runFixture) => {
      await runFixture(e2eConfig.emailCaptureDir)
    },
    {
      scope: "worker",
    },
  ],
  seed: [
    async ({}, runFixture) => {
      const seed = createE2eSeedHelpers(e2eConfig)

      try {
        await runFixture(seed)
      } finally {
        await seed.close()
      }
    },
    {
      scope: "worker",
    },
  ],
  webBaseUrl: [
    async ({}, runFixture) => {
      await runFixture(e2eConfig.webBaseUrl)
    },
    {
      scope: "worker",
    },
  ],
})

test.beforeEach(async ({ emailCaptureDir, seed }) => {
  await seed.resetDatabase()
  await clearEmailCaptures(emailCaptureDir)
})

export { expect, test }
