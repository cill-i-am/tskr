import assert from "node:assert/strict"
import test from "node:test"

import { createResendTransport } from "./index.ts"
import { EmailTransportError } from "./transports/resend.ts"

test("maps transport messages to resend request payload", async () => {
  const requests: {
    request: RequestInit
    url: string
  }[] = []
  const transport = createResendTransport({
    apiKey: "resend-key",
    fetch: async (url, request) => {
      requests.push({
        request: request ?? {},
        url: String(url),
      })

      return new Response(JSON.stringify({ id: "re_123" }), {
        status: 200,
      })
    },
  })

  const result = await transport.send({
    from: "TSKR <noreply@tskr.app>",
    html: "<p>Reset your password</p>",
    replyTo: "support@tskr.app",
    subject: "Reset your password",
    text: "Reset your password",
    to: "ada@example.com",
  })

  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, "https://api.resend.com/emails")
  assert.equal(requests[0].request.method, "POST")
  assert.deepEqual(requests[0].request.headers, {
    Authorization: "Bearer resend-key",
    "Content-Type": "application/json",
  })
  assert.deepEqual(JSON.parse(String(requests[0].request.body)), {
    from: "TSKR <noreply@tskr.app>",
    html: "<p>Reset your password</p>",
    reply_to: "support@tskr.app",
    subject: "Reset your password",
    text: "Reset your password",
    to: ["ada@example.com"],
  })
  assert.deepEqual(result, { id: "re_123" })
})

test("surfaces resend error details", async () => {
  const transport = createResendTransport({
    apiKey: "wrong-key",
    fetch: async () => new Response(JSON.stringify({ message: "invalid_api_key" }), {
        status: 401,
      }),
  })

  await assert.rejects(
    () =>
      transport.send({
        from: "TSKR <noreply@tskr.app>",
        html: "<p>Hello</p>",
        subject: "Hello",
        text: "Hello",
        to: "ada@example.com",
      }),
    (error: unknown) => {
      assert.ok(error instanceof EmailTransportError)
      assert.equal(error.status, 401)
      assert.equal(
        error.message,
        "Resend request failed (401): invalid_api_key"
      )
      return true
    }
  )
})

test("throws when resend success response is missing id", async () => {
  const transport = createResendTransport({
    apiKey: "resend-key",
    fetch: async () => new Response(JSON.stringify({ ok: true }), {
        status: 200,
      }),
  })

  await assert.rejects(
    () =>
      transport.send({
        from: "TSKR <noreply@tskr.app>",
        html: "<p>Hello</p>",
        subject: "Hello",
        text: "Hello",
        to: "ada@example.com",
      }),
    (error: unknown) => {
      assert.ok(error instanceof EmailTransportError)
      assert.equal(error.message, "Resend response missing email id")
      return true
    }
  )
})
