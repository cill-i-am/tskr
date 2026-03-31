import assert from "node:assert/strict"
import test from "node:test"

import { buildE2eSharedEnv } from "./e2e-runner-env.mjs"

test("buildE2eSharedEnv includes DATABASE_URL for Playwright-side seed helpers", () => {
  const env = buildE2eSharedEnv({
    baseEnv: {
      CUSTOM_ENV: "1",
    },
    databaseUrl: "postgresql://postgres:postgres@127.0.0.1:23456/app",
    emailCaptureDirectory: "/tmp/e2e-emails",
  })

  assert.equal(
    env.DATABASE_URL,
    "postgresql://postgres:postgres@127.0.0.1:23456/app"
  )
  assert.equal(env.CUSTOM_ENV, "1")
  assert.equal(env.E2E_EMAIL_CAPTURE_DIR, "/tmp/e2e-emails")
})
