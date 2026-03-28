import {
  fetchAuthService,
  resolveAuthBaseUrl,
  resolveRuntimeAuthBaseUrl,
} from "./auth-service-client"

describe(resolveRuntimeAuthBaseUrl, () => {
  it("prefers the server auth base url over the railway fallback", () => {
    expect(
      resolveRuntimeAuthBaseUrl({
        authBaseUrl: undefined,
        browserAuthBaseUrl: undefined,
        railwayServiceAuthUrl: "auth-production-6a1e.up.railway.app",
        runtimeAuthBaseUrl: undefined,
        serverAuthBaseUrl: "https://auth.server.example.com",
      })
    ).toBe("https://auth.server.example.com")
  })

  it("uses the railway auth host fallback on the server", () => {
    expect(
      resolveRuntimeAuthBaseUrl({
        authBaseUrl: undefined,
        browserAuthBaseUrl: undefined,
        railwayServiceAuthUrl: "auth-production-6a1e.up.railway.app",
        runtimeAuthBaseUrl: undefined,
        serverAuthBaseUrl: undefined,
      })
    ).toBe("https://auth-production-6a1e.up.railway.app")
  })
})

describe(fetchAuthService, () => {
  it("preserves the caller init and request headers when fetching the auth service", async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal("fetch", fetchMock)

    try {
      fetchMock.mockResolvedValue(new Response("", { status: 200 }))
      const request = new Request("https://web.example.com", {
        headers: {
          cookie: "session=abc",
        },
      })

      await fetchAuthService("/api/workspaces/bootstrap", {
        authBaseUrl: "https://auth.example.com",
        init: {
          headers: {
            "x-request-id": "request-123",
          },
          method: "GET",
        },
        request,
      })

      const callInit = fetchMock.mock.calls[0]?.[1] as RequestInit

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/bootstrap",
        expect.objectContaining({
          credentials: "include",
          method: "GET",
        })
      )
      expect(
        Object.fromEntries(new Headers(callInit.headers).entries())
      ).toStrictEqual({
        cookie: "session=abc",
        "x-request-id": "request-123",
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe(resolveAuthBaseUrl, () => {
  it("still falls back to localhost when no runtime auth base url is available", () => {
    expect(
      resolveAuthBaseUrl({
        authBaseUrl: undefined,
        hostname: "localhost",
        runtimeAuthBaseUrl: undefined,
      })
    ).toBe("http://localhost:3002")
  })
})
