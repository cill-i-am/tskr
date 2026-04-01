import {
  resolveApiBaseUrl,
  resolveRuntimeApiBaseUrl,
} from "./api-service-client"

describe("api service client", () => {
  it("prefers the explicit server api base url", () => {
    expect(
      resolveApiBaseUrl({
        serverApiBaseUrl: "https://api.internal.example",
      })
    ).toBe("https://api.internal.example")
  })

  it("derives the sibling api portless url on the server", () => {
    expect(
      resolveRuntimeApiBaseUrl({
        serverPortlessUrl: "https://feature.web.tskr.localhost",
      })
    ).toBe("https://feature.api.tskr.localhost")
  })

  it("uses the Railway api host fallback on the server", () => {
    expect(
      resolveRuntimeApiBaseUrl({
        railwayServiceApiUrl: "api-production-6a1e.up.railway.app",
      })
    ).toBe("https://api-production-6a1e.up.railway.app")
  })

  it("falls back to the hosted api hostname when no runtime api base url is available", () => {
    expect(
      resolveApiBaseUrl({
        hostname: "app.example.com",
        runtimeApiBaseUrl: undefined,
      })
    ).toBe("https://api.tskr.localhost")
  })

  it("keeps direct localhost browser sessions on the localhost api", () => {
    expect(
      resolveApiBaseUrl({
        hostname: "localhost",
        runtimeApiBaseUrl: undefined,
      })
    ).toBe("http://localhost:3001")
  })
})
