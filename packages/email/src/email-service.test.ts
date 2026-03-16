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
    replyTo: "support@tskr.app",
    transport: {
      async send(message) {
        messages.push(message)
        return { id: "mock-1" }
      },
    },
  })

  const result = await service.sendPasswordResetEmail({
    resetUrl: "https://app.tskr.test/reset-password?token=abc123",
    to: "ada@example.com",
  })

  assert.deepEqual(result, { id: "mock-1" })
  assert.equal(messages.length, 1)
  const message = asObject(messages[0])
  assert.equal(message.from, "TSKR <noreply@tskr.app>")
  assert.equal(message.replyTo, "support@tskr.app")
  assert.equal(message.to, "ada@example.com")
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
    replyTo: "support@tskr.app",
    transport: {
      async send(message) {
        messages.push(message)
        return { id: "mock-2" }
      },
    },
  })

  const result = await service.sendEmailVerificationEmail({
    to: "grace@example.com",
    verificationUrl: "https://app.tskr.test/verify-email?token=v-123",
  })

  assert.deepEqual(result, { id: "mock-2" })
  assert.equal(messages.length, 1)
  const message = asObject(messages[0])
  assert.equal(message.from, "TSKR <noreply@tskr.app>")
  assert.equal(message.replyTo, "support@tskr.app")
  assert.equal(message.to, "grace@example.com")
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
    replyTo: "support@tskr.app",
    supportEmail: "support@tskr.app",
    transport: {
      async send(message) {
        messages.push(message)
        return { id: "mock-3" }
      },
    },
  })

  const result = await service.sendExistingUserSignupNotice({
    signInUrl: "https://app.tskr.test/sign-in",
    to: "linus@example.com",
  })

  assert.deepEqual(result, { id: "mock-3" })
  assert.equal(messages.length, 1)
  const message = asObject(messages[0])
  assert.equal(message.from, "TSKR <noreply@tskr.app>")
  assert.equal(message.replyTo, "support@tskr.app")
  assert.equal(message.to, "linus@example.com")
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
  let loggedArgs: unknown[] = []
  const transport = createConsoleTransport({
    logger: {
      info(...args) {
        loggedArgs = args
      },
    },
  })
  const result = await transport.send({
    from: "TSKR <noreply@tskr.app>",
    html: "<a href=\"https://app.tskr.test/reset?token=secret-token\">Reset</a>",
    subject: "Hello",
    text: "Reset at https://app.tskr.test/reset?token=secret-token",
    to: "ada@example.com",
  })

  assert.match(result.id, /^console:/u)
  assert.equal(loggedArgs[0], "[email:console] send")
  assert.deepEqual(loggedArgs[1], {
    from: "TSKR <noreply@tskr.app>",
    html: '<a href="https://app.tskr.test/reset?token=secret-token">Reset</a>',
    replyTo: undefined,
    subject: "Hello",
    text: "Reset at https://app.tskr.test/reset?token=secret-token",
    to: "ada@example.com",
  })
  assert.equal(JSON.stringify(loggedArgs).includes("secret-token"), true)
})
