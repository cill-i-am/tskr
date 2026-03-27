/* eslint-disable jest/expect-expect, jest/require-top-level-describe */

import assert from "node:assert/strict"

import { createConsoleTransport } from "./index.ts"

test("console transport logs the full email payload for local development", async () => {
  const calls: unknown[][] = []
  const logger = {
    info: (...args: unknown[]) => {
      calls.push(args)
    },
  }
  const transport = createConsoleTransport({
    logger,
  })

  await transport.send({
    from: "TSKR <noreply@tskr.app>",
    html: "<p>Reset your password</p>",
    replyTo: "support@tskr.app",
    subject: "Reset your password",
    text: "Reset your password: https://app.example.com/reset?token=abc123",
    to: "grace@example.com",
  })

  assert.deepEqual(calls, [
    [
      "[email:console] send",
      {
        from: "TSKR <noreply@tskr.app>",
        html: "<p>Reset your password</p>",
        replyTo: "support@tskr.app",
        subject: "Reset your password",
        text: "Reset your password: https://app.example.com/reset?token=abc123",
        to: "grace@example.com",
      },
    ],
  ])
})
