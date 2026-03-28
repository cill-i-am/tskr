import {
  fetchAuthService,
  resolveAuthBaseUrl,
  resolveRuntimeAuthBaseUrl,
} from "./auth-service-client"

describe("runtime auth base url resolution", () => {
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

describe("auth service fetching", () => {
  it("merges request, init, and helper headers when fetching the auth service", async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal("fetch", fetchMock)

    try {
      fetchMock.mockResolvedValue(new Response("", { status: 200 }))
      const request = new Request("https://web.example.com", {
        headers: {
          cookie: "session=abc",
          "x-request-id": "request-from-request",
        },
      })

      await fetchAuthService("/api/workspaces/bootstrap", {
        authBaseUrl: "https://auth.example.com",
        headers: {
          "x-request-id": "request-from-helper",
          "x-trace-id": "trace-from-helper",
        },
        init: {
          headers: {
            "x-request-id": "request-from-init",
            "x-session-id": "session-from-init",
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
        "x-request-id": "request-from-helper",
        "x-session-id": "session-from-init",
        "x-trace-id": "trace-from-helper",
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe("auth base url resolution", () => {
  it("still falls back to localhost when no runtime auth base url is available", () => {
    expect(
      resolveAuthBaseUrl({
        authBaseUrl: undefined,
        hostname: "localhost",
        runtimeAuthBaseUrl: undefined,
      })
    ).toBe("http://localhost:3002")
  })

  it("keeps an explicit auth base url override ahead of the server runtime fallback", () => {
    vi.stubEnv("VITE_AUTH_BASE_URL", "https://auth.server.example.com")

    try {
      expect(
        resolveAuthBaseUrl({
          authBaseUrl: "https://auth.override.example.com",
          hostname: "example.com",
          runtimeAuthBaseUrl: undefined,
        })
      ).toBe("https://auth.override.example.com")
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
