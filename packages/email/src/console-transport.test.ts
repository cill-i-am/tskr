import assert from "node:assert/strict"
import test from "node:test"

import { createConsoleTransport } from "./index.ts"

test("console transport logs the full email payload for local development", async () => {
  const logger = {
    info: (...args: unknown[]) => {
      calls.push(args)
    },
  }
  const calls: unknown[][] = []
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
