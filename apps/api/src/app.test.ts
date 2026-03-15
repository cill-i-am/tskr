import assert from "node:assert/strict"

import { hc } from "hono/client"

import { app } from "./app.js"
import type { AppType } from "./app.js"
import { upResponse } from "./domains/system/healthcheck/index.js"

describe("api app", () => {
  it("gET /up returns the expected healthcheck payload", async () => {
    const response = await app.request("/up")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual(upResponse)
  })

  it("appType can be used to create a typed Hono client", () => {
    const client = hc<AppType>("http://localhost")

    assert.equal(typeof client.up.$get, "function")
  })
})
