/* eslint-disable jest/expect-expect, jest/require-top-level-describe */

import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import * as emailPackage from "./index.ts"
import { createEmailService } from "./index.ts"

test("root export surface is explicit and provider-agnostic", () => {
  assert.deepEqual(Object.keys(emailPackage).toSorted(), [
    "createConsoleTransport",
    "createEmailService",
    "createResendTransport",
  ])
  assert.equal("EmailTransportError" in emailPackage, false)
})

test("package.json export map points to built root entrypoint", async () => {
  const srcDir = dirname(fileURLToPath(import.meta.url))
  const packageJsonPath = join(srcDir, "..", "package.json")
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    exports: Record<string, unknown>
    types: string
  }

  assert.equal(packageJson.types, "./dist/index.d.mts")
  assert.deepEqual(packageJson.exports["."], {
    import: "./dist/index.mjs",
    types: "./dist/index.d.mts",
  })
})

test("email service exposes the spec'd auth method names", () => {
  const service = createEmailService({
    appName: "tskr",
    from: "TSKR <noreply@tskr.app>",
    signupVerificationOtpExpiryText: "5 minutes",
    transport: {
      send() {
        return Promise.resolve({ id: "mock-1" })
      },
    },
  })

  assert.deepEqual(Object.keys(service).toSorted(), [
    "sendEmailVerificationEmail",
    "sendExistingUserSignupNotice",
    "sendPasswordResetEmail",
    "sendSignupVerificationOtpEmail",
  ])
})
