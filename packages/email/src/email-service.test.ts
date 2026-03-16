import assert from "node:assert/strict"
import test from "node:test"

import { createConsoleTransport, createEmailService } from "./index.ts"

const asObject = (value: unknown): Record<string, unknown> =>
  value as Record<string, unknown>

test("renders password reset subject, html, and text", async () => {
  const messages: unknown[] = []
  const service = createEmailService({
    appName: "tskr",
    from: "TSKR <noreply@tskr.app>",
    transport: {
      async send(message) {
        messages.push(message)
        return { id: "mock-1" }
      },
    },
  })

  await service.sendPasswordReset({
    resetUrl: "https://app.tskr.test/reset-password?token=abc123",
    to: "ada@example.com",
  })

  assert.equal(messages.length, 1)
  const message = asObject(messages[0])
  assert.equal(message.subject, "Reset your tskr password")
  assert.match(
    String(message.text),
    /https:\/\/app\.tskr\.test\/reset-password\?token=abc123/u
  )
  assert.match(
    String(message.html),
    /<a href="https:\/\/app\.tskr\.test\/reset-password\?token=abc123">Reset password<\/a>/u
  )
})

test("renders verification subject, html, and text", async () => {
  const messages: unknown[] = []
  const service = createEmailService({
    appName: "tskr",
    from: "TSKR <noreply@tskr.app>",
    transport: {
      async send(message) {
        messages.push(message)
        return { id: "mock-2" }
      },
    },
  })

  await service.sendEmailVerification({
    to: "grace@example.com",
    verificationUrl: "https://app.tskr.test/verify-email?token=v-123",
  })

  assert.equal(messages.length, 1)
  const message = asObject(messages[0])
  assert.equal(message.subject, "Verify your tskr email")
  assert.match(
    String(message.text),
    /https:\/\/app\.tskr\.test\/verify-email\?token=v-123/u
  )
  assert.match(
    String(message.html),
    /<a href="https:\/\/app\.tskr\.test\/verify-email\?token=v-123">Verify email<\/a>/u
  )
})

test("renders existing-user sign-up notice subject, html, and text", async () => {
  const messages: unknown[] = []
  const service = createEmailService({
    appName: "tskr",
    from: "TSKR <noreply@tskr.app>",
    supportEmail: "support@tskr.app",
    transport: {
      async send(message) {
        messages.push(message)
        return { id: "mock-3" }
      },
    },
  })

  await service.sendExistingUserSignUpNotice({
    signInUrl: "https://app.tskr.test/sign-in",
    to: "linus@example.com",
  })

  assert.equal(messages.length, 1)
  const message = asObject(messages[0])
  assert.equal(
    message.subject,
    "Someone tried to sign up with this email on tskr"
  )
  assert.match(String(message.text), /support@tskr\.app/u)
  assert.match(
    String(message.html),
    /<a href="https:\/\/app\.tskr\.test\/sign-in">Sign in<\/a>/u
  )
})

test("createConsoleTransport returns a transport id", async () => {
  const transport = createConsoleTransport({
    logger: {
      info() {},
    },
  })
  const result = await transport.send({
    from: "TSKR <noreply@tskr.app>",
    html: "<p>Hello</p>",
    subject: "Hello",
    text: "Hello",
    to: "ada@example.com",
  })

  assert.match(result.id, /^console:/u)
})
