/* eslint-disable jest/valid-title */

import {
  resolveCrossSubDomainCookies,
  resolveDefaultCookieAttributes,
} from "./cookie-attributes.js"

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

  it("enables cross-subdomain cookies for Portless tskr hosts", () => {
    expect(
      resolveCrossSubDomainCookies("http://e2e-auth.tskr.localhost:1355")
    ).toStrictEqual({
      domain: "tskr.localhost",
      enabled: true,
    })
    expect(
      resolveCrossSubDomainCookies(
        "http://feature.e2e-auth.tskr.localhost:1355"
      )
    ).toStrictEqual({
      domain: "tskr.localhost",
      enabled: true,
    })
  })

  it("keeps cross-subdomain cookies disabled for direct localhost", () => {
    expect(
      resolveCrossSubDomainCookies("http://localhost:3002")
    ).toBeUndefined()
  })
})
