/* oxlint-disable jest/max-expects, jest/no-conditional-expect, jest/no-conditional-in-test, jest/no-hooks, require-await, unicorn/prefer-response-static-json, vitest/prefer-called-once */
import { hc } from "hono/client"

import { app } from "./app.js"
import type { AppType } from "./app.js"
import { upResponse } from "./domains/system/healthcheck/index.js"

const createJsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  })

describe("api app", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("returns the expected /up healthcheck payload", async () => {
    const response = await app.request("/up")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual(upResponse)
  })

  it("exports AppType for typed Hono clients", () => {
    const client = hc<AppType>("http://localhost")

    expectTypeOf(client.up.$get).toBeFunction()
  })

  it("derives a minimal sync context from the auth workspace settings snapshot", async () => {
    vi.stubEnv("SERVER_AUTH_BASE_URL", "http://auth.internal:3002")

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        expect(input).toBe(
          "http://auth.internal:3002/api/workspaces/workspace-123/settings"
        )
        expect(new Headers(init?.headers).get("cookie")).toBe(
          "session=workspace-session"
        )

        return createJsonResponse({
          accountProfile: {
            email: "owner@example.com",
            id: "user-123",
            image: null,
            name: "Owner User",
          },
          members: [
            {
              id: "member-1",
              userId: "user-123",
            },
          ],
          pendingInvites: [],
          permissions: {
            canManageInvites: true,
            canManageMembers: true,
          },
          viewerRole: "owner",
          workspaceProfile: {
            id: "workspace-123",
            logo: null,
            name: "Ops Control",
            slug: "ops-control",
          },
        })
      })

    const response = await app.request(
      "/api/sync/workspaces/workspace-123/context",
      {
        headers: {
          cookie: "session=workspace-session",
        },
      }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({
      resources: {
        workspace: "/api/sync/workspaces/workspace-123/shapes/workspace",
        workspaceInvites:
          "/api/sync/workspaces/workspace-123/shapes/workspace-invites",
        workspaceMembers:
          "/api/sync/workspaces/workspace-123/shapes/workspace-members",
      },
      userId: "user-123",
      viewerRole: "owner",
      workspace: {
        id: "workspace-123",
        logo: null,
        name: "Ops Control",
        slug: "ops-control",
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("proxies an allowlisted workspace-members shape with server-owned Electric params", async () => {
    vi.stubEnv("SERVER_AUTH_BASE_URL", "http://auth.internal:3002")
    vi.stubEnv("ELECTRIC_URL", "http://electric.internal:3000")
    vi.stubEnv("ELECTRIC_SECRET", "electric-secret")

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = typeof input === "string" ? input : input.toString()
        const shapeUrl = new URL(url)

        if (shapeUrl.pathname === "/api/workspaces/workspace-123/settings") {
          expect(new Headers(init?.headers).get("cookie")).toBe(
            "session=workspace-session"
          )
          expect(new Headers(init?.headers).get("accept")).toBeNull()
          expect(new Headers(init?.headers).get("if-none-match")).toBeNull()

          return createJsonResponse({
            accountProfile: {
              id: "user-123",
            },
            members: [
              {
                id: "member-1",
                userId: "user-123",
              },
            ],
            viewerRole: "owner",
            workspaceProfile: {
              id: "workspace-123",
              logo: null,
              name: "Ops Control",
              slug: "ops-control",
            },
          })
        }

        expect(shapeUrl.origin).toBe("http://electric.internal:3000")
        expect(shapeUrl.pathname).toBe("/v1/shape")
        expect(shapeUrl.searchParams.get("offset")).toBe("-1")
        expect(shapeUrl.searchParams.get("live")).toBe("true")
        expect(shapeUrl.searchParams.get("table")).toBe("auth.member")
        expect(shapeUrl.searchParams.get("where")).toBe("organization_id = $1")
        expect(shapeUrl.searchParams.get("params[1]")).toBe("workspace-123")
        expect(shapeUrl.searchParams.get("columns")).toBe(
          "id,organization_id,user_id,role,created_at"
        )
        expect(shapeUrl.searchParams.get("secret")).toBe("electric-secret")
        expect(shapeUrl.searchParams.get("where")).not.toBe("1=1")
        expect(shapeUrl.searchParams.get("table")).not.toBe("auth.user")
        expect(new Headers(init?.headers).get("accept")).toBe(
          "application/json"
        )
        expect(new Headers(init?.headers).get("cookie")).toBeNull()
        expect(new Headers(init?.headers).get("if-none-match")).toBe(
          '"workspace-members-etag"'
        )

        return new Response('[{"headers":{"operation":"up-to-date"}}]', {
          headers: {
            "content-encoding": "gzip",
            "content-length": "999",
            "content-type": "application/json",
            etag: '"workspace-members-etag"',
          },
          status: 200,
        })
      })

    const response = await app.request(
      "/api/sync/workspaces/workspace-123/shapes/workspace-members?offset=-1&live=true&table=auth.user&where=1%3D1",
      {
        headers: {
          accept: "application/json",
          cookie: "session=workspace-session",
          "if-none-match": '"workspace-members-etag"',
        },
      }
    )

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe(
      '[{"headers":{"operation":"up-to-date"}}]'
    )
    expect(response.headers.get("etag")).toBe('"workspace-members-etag"')
    expect(response.headers.get("content-encoding")).toBeNull()
    expect(response.headers.get("content-length")).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("rejects unknown sync shape resources without proxying upstream", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")

    const response = await app.request(
      "/api/sync/workspaces/workspace-123/shapes/not-a-real-resource?offset=-1"
    )

    expect(response.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
