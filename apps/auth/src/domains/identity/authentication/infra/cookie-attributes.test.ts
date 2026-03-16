/* eslint-disable jest/valid-title */

import { resolveDefaultCookieAttributes } from "./cookie-attributes.js"

describe(resolveDefaultCookieAttributes, () => {
  it("uses SameSite=None for https auth origins", () => {
    expect(
      resolveDefaultCookieAttributes(
        "https://auth-production-6a1e.up.railway.app"
      )
    ).toStrictEqual({
      sameSite: "none",
    })
  })

  it("keeps SameSite=Lax for direct http localhost", () => {
    expect(
      resolveDefaultCookieAttributes("http://localhost:3002")
    ).toStrictEqual({
      sameSite: "lax",
    })
  })
})
