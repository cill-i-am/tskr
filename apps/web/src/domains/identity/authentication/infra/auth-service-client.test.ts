

import {
  fetchAuthService,
  resolveAuthBaseUrl,
  resolveRuntimeAuthBaseUrl,
} from "./auth-service-client"

describe(resolveRuntimeAuthBaseUrl, () => {
  it("uses the railway auth host fallback on the server", () => {
    expect(
      resolveRuntimeAuthBaseUrl({
        authBaseUrl: undefined,
        railwayServiceAuthUrl: "auth-production-6a1e.up.railway.app",
        runtimeAuthBaseUrl: undefined,
      })
    ).toBe("https://auth-production-6a1e.up.railway.app")
  })
})

describe(fetchAuthService, () => {
  it("preserves the caller init when fetching the auth service", async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal("fetch", fetchMock)

    try {
      fetchMock.mockResolvedValue(new Response("", { status: 200 }))

      await fetchAuthService(
        "/api/workspaces/bootstrap",
        {
          headers: {
            cookie: "session=abc",
          },
          method: "GET",
        },
        {
          authBaseUrl: "https://auth.example.com",
        }
      )

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/bootstrap",
        {
          credentials: "include",
          headers: {
            cookie: "session=abc",
          },
          method: "GET",
        }
      )
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
