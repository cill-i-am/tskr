import {
  clearCurrentStartRequest,
  setCurrentStartRequest,
  withoutWindow,
} from "@/test-helpers"

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
        authBaseUrl: "",
        browserAuthBaseUrl: undefined,
        railwayServiceAuthUrl: "auth-production-6a1e.up.railway.app",
        runtimeAuthBaseUrl: undefined,
        serverAuthBaseUrl: "",
      })
    ).toBe("https://auth-production-6a1e.up.railway.app")
  })

  it("derives the sibling auth url from the injected web Portless URL", () => {
    expect(
      resolveRuntimeAuthBaseUrl({
        authBaseUrl: undefined,
        browserAuthBaseUrl: undefined,
        railwayServiceAuthUrl: undefined,
        runtimeAuthBaseUrl: undefined,
        serverAuthBaseUrl: undefined,
        serverPortlessUrl: "https://feature-x.e2e-web.tskr.localhost:1355",
      })
    ).toBe("https://feature-x.e2e-auth.tskr.localhost:1355")
  })
})

describe("auth service fetching", () => {
  it("forwards cookies from the current Start request when no explicit request is passed", async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal("fetch", fetchMock)

    try {
      fetchMock.mockResolvedValue(new Response("", { status: 200 }))
      setCurrentStartRequest(
        new Request("https://web.example.com/app", {
          headers: {
            cookie: "session=from-start-request",
          },
        })
      )

      await withoutWindow(async () => {
        await fetchAuthService("/api/workspaces/bootstrap", {
          authBaseUrl: "https://auth.example.com",
        })
      })

      const callInit = fetchMock.mock.calls[0]?.[1] as RequestInit

      expect(
        Object.fromEntries(new Headers(callInit.headers).entries())
      ).toStrictEqual({
        cookie: "session=from-start-request",
      })
    } finally {
      vi.unstubAllGlobals()
      clearCurrentStartRequest()
    }
  })

  it("resolves direct localhost server requests to the localhost auth base url", async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal("fetch", fetchMock)

    try {
      fetchMock.mockResolvedValue(new Response("", { status: 200 }))
      const request = new Request("http://localhost:5173/workspaces")

      await fetchAuthService("/api/workspaces/bootstrap", {
        request,
      })

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3002/api/workspaces/bootstrap",
        expect.objectContaining({
          credentials: "include",
        })
      )
    } finally {
      vi.unstubAllGlobals()
      clearCurrentStartRequest()
    }
  })

  it("forwards only whitelisted request headers when fetching the auth service", async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal("fetch", fetchMock)

    try {
      fetchMock.mockResolvedValue(new Response("", { status: 200 }))
      const request = new Request("https://web.example.com", {
        headers: {
          authorization: "Bearer request-token",
          cookie: "session=abc",
          "x-request-id": "request-from-request",
        },
      })

      await fetchAuthService("/api/workspaces/bootstrap", {
        authBaseUrl: "https://auth.example.com",
        request,
      })

      const callInit = fetchMock.mock.calls[0]?.[1] as RequestInit

      expect(
        Object.fromEntries(new Headers(callInit.headers).entries())
      ).toStrictEqual({
        cookie: "session=abc",
      })
    } finally {
      vi.unstubAllGlobals()
      clearCurrentStartRequest()
    }
  })

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
      clearCurrentStartRequest()
    }
  })
})

describe("auth base url resolution", () => {
  it("prefers an internal server auth base url over the public runtime auth base url", () => {
    expect(
      resolveAuthBaseUrl({
        hostname: "trace-smoke.web.tskr.localhost",
        runtimeAuthBaseUrl: "https://trace-smoke.auth.tskr.localhost",
        serverAuthBaseUrl: "http://auth:3002",
      })
    ).toBe("http://auth:3002")
  })

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
