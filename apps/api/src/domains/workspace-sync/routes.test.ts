/* oxlint-disable import/no-relative-parent-imports, require-await */
import { createApp } from "../../app.js"

describe("workspace sync routes", () => {
  it("returns workspace sync context through the injected sync service", async () => {
    const getSyncContext = vi.fn(async ({ headers, workspaceId }) => {
      expect(headers.get("cookie")).toBe("session=abc")
      expect(workspaceId).toBe("workspace-123")

      return {
        resources: {
          workspace: "/api/sync/workspaces/workspace-123/shapes/workspace",
          workspaceInvites:
            "/api/sync/workspaces/workspace-123/shapes/workspace-invites",
          workspaceMemberUsers:
            "/api/sync/workspaces/workspace-123/shapes/workspace-member-users",
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
      }
    })
    const proxyShape = vi.fn()
    const app = createApp({
      workspaceSyncService: {
        getSyncContext,
        proxyShape,
      },
    })

    const response = await app.request(
      "/api/sync/workspaces/workspace-123/context",
      {
        headers: {
          cookie: "session=abc",
        },
      }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({
      resources: {
        workspace: "/api/sync/workspaces/workspace-123/shapes/workspace",
        workspaceInvites:
          "/api/sync/workspaces/workspace-123/shapes/workspace-invites",
        workspaceMemberUsers:
          "/api/sync/workspaces/workspace-123/shapes/workspace-member-users",
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
    expect(getSyncContext).toHaveBeenCalledTimes(1)
    expect(proxyShape).not.toHaveBeenCalled()
  })

  it("passes proxied shape requests through the injected sync service", async () => {
    const getSyncContext = vi.fn()
    const proxyShape = vi.fn(
      async ({ headers, query, resource, workspaceId }) => {
        expect(headers.get("cookie")).toBe("session=abc")
        expect(query.toString()).toBe("offset=-1&live=true")
        expect(resource).toBe("workspace-members")
        expect(workspaceId).toBe("workspace-123")

        return new Response('[{"headers":{"operation":"up-to-date"}}]', {
          headers: {
            "content-type": "application/json",
            etag: '"workspace-members-etag"',
          },
          status: 200,
        })
      }
    )
    const app = createApp({
      workspaceSyncService: {
        getSyncContext,
        proxyShape,
      },
    })

    const response = await app.request(
      "/api/sync/workspaces/workspace-123/shapes/workspace-members?offset=-1&live=true",
      {
        headers: {
          cookie: "session=abc",
        },
      }
    )

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe(
      '[{"headers":{"operation":"up-to-date"}}]'
    )
    expect(response.headers.get("etag")).toBe('"workspace-members-etag"')
    expect(proxyShape).toHaveBeenCalledTimes(1)
    expect(getSyncContext).not.toHaveBeenCalled()
  })
})
