/* eslint-disable jest/expect-expect, jest/require-top-level-describe */

import assert from "node:assert/strict"

import { createEmailService } from "./index.ts"

const asObject = (value: unknown): Record<string, unknown> =>
  value as Record<string, unknown>

test("renders password reset subject, html, and text", async () => {
  const messages: unknown[] = []
  const service = createEmailService({
    appName: "tskr",
    from: "TSKR <noreply@tskr.app>",
    replyTo: "support@tskr.app",
    signupVerificationOtpExpiryText: "5 minutes",
    transport: {
      send(message) {
        messages.push(message)
        return Promise.resolve({ id: "mock-1" })
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
    signupVerificationOtpExpiryText: "5 minutes",
    transport: {
      send(message) {
        messages.push(message)
        return Promise.resolve({ id: "mock-2" })
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

test("renders signup verification OTP subject, html, and text", async () => {
  const messages: unknown[] = []
  const service = createEmailService({
    appName: "Orbit",
    from: "Orbit <noreply@orbit.app>",
    replyTo: "help@orbit.app",
    signupVerificationOtpExpiryText: "10 minutes",
    transport: {
      send(message) {
        messages.push(message)
        return Promise.resolve({ id: "mock-otp" })
      },
    },
  })

  const code = "123456"
  const result = await service.sendSignupVerificationOtpEmail({
    code,
    to: "ada@example.com",
  })

  assert.deepEqual(result, { id: "mock-otp" })
  assert.equal(messages.length, 1)
  const message = asObject(messages[0])
  assert.equal(message.from, "Orbit <noreply@orbit.app>")
  assert.equal(message.replyTo, "help@orbit.app")
  assert.equal(message.to, "ada@example.com")
  assert.equal(message.subject, "Your Orbit verification code")
  assert.match(
    String(message.text),
    /Your one-time sign-up verification code is/u
  )
  assert.match(String(message.text), /123456/u)
  assert.match(String(message.text), /expires in 10 minutes/u)
  assert.match(String(message.html), /<strong>123456<\/strong>/u)
  assert.match(String(message.html), /Your one-time sign-up verification code/u)
  assert.match(String(message.html), /expires in 10 minutes/u)
})

test("renders existing-user sign-up notice subject, html, and text", async () => {
  const messages: unknown[] = []
  const service = createEmailService({
    appName: "tskr",
    from: "TSKR <noreply@tskr.app>",
    replyTo: "support@tskr.app",
    signupVerificationOtpExpiryText: "5 minutes",
    supportEmail: "support@tskr.app",
    transport: {
      send(message) {
        messages.push(message)
        return Promise.resolve({ id: "mock-3" })
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
