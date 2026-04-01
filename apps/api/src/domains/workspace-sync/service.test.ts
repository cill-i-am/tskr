/* oxlint-disable jest/max-expects, jest/no-conditional-expect, jest/no-conditional-in-test, require-await, unicorn/prefer-response-static-json */
import type { HTTPException } from "hono/http-exception"

import { createWorkspaceSyncService } from "./index.js"

const createJsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  })

describe("workspace sync service", () => {
  it("derives sync context from the auth-owned workspace settings snapshot", async () => {
    const fetchMock = vi.fn(
      async (input: Request | string | URL, init?: RequestInit) => {
        const url = input instanceof URL ? input : new URL(input.toString())

        expect(url.toString()).toBe(
          "http://auth.internal/api/workspaces/ws_123/settings"
        )
        expect(new Headers(init?.headers).get("cookie")).toBe("session=abc")
        expect(new Headers(init?.headers).get("accept")).toBeNull()
        expect(new Headers(init?.headers).get("if-none-match")).toBeNull()

        return createJsonResponse({
          accountProfile: {
            id: "user_1",
          },
          viewerRole: "owner",
          workspaceProfile: {
            id: "ws_123",
            logo: null,
            name: "Acme Field Services",
            slug: "acme-field-services",
          },
        })
      }
    )
    const service = createWorkspaceSyncService({
      authBaseUrl: "http://auth.internal",
      electricBaseUrl: "http://electric.internal",
      fetch: fetchMock,
    })

    const context = await service.getSyncContext({
      headers: new Headers({
        cookie: "session=abc",
      }),
      workspaceId: "ws_123",
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(context).toStrictEqual({
      resources: {
        workspace: "/api/sync/workspaces/ws_123/shapes/workspace",
        workspaceInvites:
          "/api/sync/workspaces/ws_123/shapes/workspace-invites",
        workspaceMembers:
          "/api/sync/workspaces/ws_123/shapes/workspace-members",
      },
      userId: "user_1",
      viewerRole: "owner",
      workspace: {
        id: "ws_123",
        logo: null,
        name: "Acme Field Services",
        slug: "acme-field-services",
      },
    })
  })

  it("rejects unauthorized sync context requests with the auth status code", async () => {
    const service = createWorkspaceSyncService({
      authBaseUrl: "http://auth.internal",
      electricBaseUrl: "http://electric.internal",
      fetch: vi.fn(async () =>
        createJsonResponse(
          {
            message: "Authentication is required.",
          },
          {
            status: 401,
          }
        )
      ),
    })

    await expect(
      service.getSyncContext({
        headers: new Headers(),
        workspaceId: "ws_123",
      })
    ).rejects.toMatchObject({
      message: "Authentication is required.",
      status: 401,
    } satisfies Partial<HTTPException>)
  })

  it("preserves auth json error payloads that omit a message field", async () => {
    const service = createWorkspaceSyncService({
      authBaseUrl: "http://auth.internal",
      electricBaseUrl: "http://electric.internal",
      fetch: vi.fn(async () =>
        createJsonResponse(
          {
            error: "Authentication is required.",
          },
          {
            status: 403,
          }
        )
      ),
    })

    await expect(
      service.getSyncContext({
        headers: new Headers(),
        workspaceId: "ws_123",
      })
    ).rejects.toMatchObject({
      message: '{"error":"Authentication is required."}',
      status: 403,
    } satisfies Partial<HTTPException>)
  })

  it("builds members shape requests with server-owned table and where clauses", async () => {
    const fetchMock = vi.fn(
      async (input: Request | string | URL, init?: RequestInit) => {
        const url = input instanceof URL ? input : new URL(input.toString())

        if (url.pathname === "/api/workspaces/ws_123/settings") {
          expect(new Headers(init?.headers).get("cookie")).toBe("session=abc")
          expect(new Headers(init?.headers).get("accept")).toBeNull()
          expect(new Headers(init?.headers).get("if-none-match")).toBeNull()

          return createJsonResponse({
            accountProfile: {
              id: "user_1",
            },
            viewerRole: "owner",
            workspaceProfile: {
              id: "ws_123",
              logo: null,
              name: "Acme Field Services",
              slug: "acme-field-services",
            },
          })
        }

        expect(url.origin).toBe("http://electric.internal")
        expect(url.pathname).toBe("/v1/shape")
        expect(url.searchParams.get("live")).toBe("true")
        expect(url.searchParams.get("offset")).toBe("-1")
        expect(url.searchParams.get("table")).toBe("auth.member")
        expect(url.searchParams.get("where")).toBe("organization_id = $1")
        expect(url.searchParams.get("params[1]")).toBe("ws_123")
        expect(url.searchParams.get("columns")).toBe(
          "id,organization_id,user_id,role,created_at"
        )
        expect(init?.headers).toBeInstanceOf(Headers)
        expect(new Headers(init?.headers).get("accept")).toBe(
          "application/json"
        )
        expect(new Headers(init?.headers).get("cookie")).toBeNull()
        expect(new Headers(init?.headers).get("if-none-match")).toBe(
          '"workspace-members-etag"'
        )

        return createJsonResponse({
          rows: [],
        })
      }
    )
    const service = createWorkspaceSyncService({
      authBaseUrl: "http://auth.internal",
      electricBaseUrl: "http://electric.internal",
      fetch: fetchMock,
    })

    const response = await service.proxyShape({
      headers: new Headers({
        accept: "application/json",
        cookie: "session=abc",
        "if-none-match": '"workspace-members-etag"',
      }),
      query: new URLSearchParams("live=true&offset=-1"),
      resource: "workspace-members",
      workspaceId: "ws_123",
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({
      rows: [],
    })
  })

  it("rejects shape requests when Electric is not configured", async () => {
    const fetchMock = vi.fn()

    vi.stubEnv("ELECTRIC_URL", "")

    const service = createWorkspaceSyncService({
      authBaseUrl: "http://auth.internal",
      fetch: fetchMock,
    })

    await expect(
      service.proxyShape({
        headers: new Headers({
          cookie: "session=abc",
        }),
        query: new URLSearchParams(),
        resource: "workspace-members",
        workspaceId: "ws_123",
      })
    ).rejects.toMatchObject({
      message: "Workspace sync is not configured for this environment.",
      status: 503,
    } satisfies Partial<HTTPException>)
    expect(fetchMock).not.toHaveBeenCalled()

    vi.unstubAllEnvs()
  })
  it("rejects unsupported shape resources before reaching Electric", async () => {
    const fetchMock = vi.fn()
    const service = createWorkspaceSyncService({
      authBaseUrl: "http://auth.internal",
      electricBaseUrl: "http://electric.internal",
      fetch: fetchMock,
    })

    await expect(
      service.proxyShape({
        headers: new Headers(),
        query: new URLSearchParams(),
        resource: "tasks",
        workspaceId: "ws_123",
      })
    ).rejects.toMatchObject({
      message: "Unsupported sync resource: tasks.",
      status: 404,
    } satisfies Partial<HTTPException>)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
