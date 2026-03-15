import { hc } from "hono/client"

import { app } from "./app.js"
import type { AppType } from "./app.js"
import { upResponse } from "./domains/system/healthcheck/index.js"

describe("api app", () => {
  it("returns the expected /up healthcheck payload", async () => {
    const response = await app.request("/up")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual(upResponse)
  })

  it("exports AppType for typed Hono clients", () => {
    const client = hc<AppType>("http://localhost")

    expectTypeOf(client.up.$get).toBeFunction()
  })
})
