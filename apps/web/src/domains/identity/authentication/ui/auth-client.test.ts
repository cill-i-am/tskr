/* eslint-disable jest/valid-title */
import { resolveAuthBaseUrl } from "./auth-client"

describe(resolveAuthBaseUrl, () => {
  it("prefers the runtime auth base url embedded in the document", () => {
    expect(
      resolveAuthBaseUrl({
        authBaseUrl: undefined,
        hostname: "web-production-65874.up.railway.app",
        runtimeAuthBaseUrl: "https://auth-production-6a1e.up.railway.app",
      })
    ).toBe("https://auth-production-6a1e.up.railway.app")
  })

  it("prefers the explicit auth base url env var", () => {
    expect(
      resolveAuthBaseUrl({
        authBaseUrl: "https://auth.example.com",
        hostname: "localhost",
      })
    ).toBe("https://auth.example.com")
  })

  it("falls back to the direct local auth service on localhost", () => {
    expect(
      resolveAuthBaseUrl({
        hostname: "localhost",
      })
    ).toBe("http://localhost:3002")
  })

  it("uses the portless auth hostname outside direct localhost", () => {
    expect(
      resolveAuthBaseUrl({
        hostname: "web.tskr.localhost",
      })
    ).toBe("https://auth.tskr.localhost:1355")
  })
})
