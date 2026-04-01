import {
  createWorkspacePeopleSyncMutationClient,
  workspacePeopleSyncCommandsBasePath,
} from "./workspace-people-mutation-client"

describe("workspace people sync mutation client", () => {
  it("posts a create invite command and parses the shared txid envelope", async () => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    document.documentElement.dataset.apiBaseUrl = "http://api.internal:3001"

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        invite: {
          acceptUrl: "https://app.tskr.test/invites/accept?code=invite-123",
          code: "invite-123",
          email: "ada@example.com",
          id: "invite-1",
          role: "admin",
          status: "pending",
          workspaceId: "workspace-123",
        },
        syncConfirmation: {
          txid: "123",
        },
      })
    )

    const client = createWorkspacePeopleSyncMutationClient()
    const response = await client.createWorkspaceInvite({
      email: "ada@example.com",
      role: "admin",
      workspaceId: "workspace-123",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.internal:3001/api/workspaces/workspace-123/invites",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
      })
    )
    expect(response.syncConfirmation.txid).toBe("123")
    expect(response.invite.id).toBe("invite-1")
    delete document.documentElement.dataset.apiBaseUrl
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("posts a resend invite command and parses the shared txid envelope", async () => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    document.documentElement.dataset.apiBaseUrl = "http://api.internal:3001"

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        inviteId: "invite-1",
        syncConfirmation: {
          txid: "124",
        },
        workspaceId: "workspace-123",
      })
    )

    const client = createWorkspacePeopleSyncMutationClient()
    const response = await client.resendWorkspaceInvite({
      inviteId: "invite-1",
      workspaceId: "workspace-123",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.internal:3001/api/workspaces/workspace-123/invites/invite-1/resend",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
      })
    )
    expect(response.syncConfirmation.txid).toBe("124")
    expect(response.inviteId).toBe("invite-1")
    delete document.documentElement.dataset.apiBaseUrl
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("posts a revoke invite command and parses the shared txid envelope", async () => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    document.documentElement.dataset.apiBaseUrl = "http://api.internal:3001"

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        inviteId: "invite-1",
        syncConfirmation: {
          txid: "125",
        },
        workspaceId: "workspace-123",
      })
    )

    const client = createWorkspacePeopleSyncMutationClient()
    const response = await client.revokeWorkspaceInvite({
      inviteId: "invite-1",
      workspaceId: "workspace-123",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.internal:3001/api/workspaces/workspace-123/invites/invite-1",
      expect.objectContaining({
        credentials: "include",
        method: "DELETE",
      })
    )
    expect(response.syncConfirmation.txid).toBe("125")
    expect(response.inviteId).toBe("invite-1")
    delete document.documentElement.dataset.apiBaseUrl
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("patches a workspace member role and parses the shared txid envelope", async () => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    document.documentElement.dataset.apiBaseUrl = "http://api.internal:3001"

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        memberId: "member-1",
        role: "dispatcher",
        syncConfirmation: {
          txid: "126",
        },
        workspaceId: "workspace-123",
      })
    )

    const client = createWorkspacePeopleSyncMutationClient()
    const response = await client.updateWorkspaceMemberRole({
      memberId: "member-1",
      role: "dispatcher",
      workspaceId: "workspace-123",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.internal:3001/api/workspaces/workspace-123/members/member-1/role",
      expect.objectContaining({
        body: JSON.stringify({
          role: "dispatcher",
        }),
        credentials: "include",
        method: "PATCH",
      })
    )
    expect(response.syncConfirmation.txid).toBe("126")
    expect(response.memberId).toBe("member-1")
    expect(response.role).toBe("dispatcher")
    delete document.documentElement.dataset.apiBaseUrl
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("deletes a workspace member and parses the shared txid envelope", async () => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    document.documentElement.dataset.apiBaseUrl = "http://api.internal:3001"

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        memberId: "member-1",
        syncConfirmation: {
          txid: "127",
        },
        workspaceId: "workspace-123",
      })
    )

    const client = createWorkspacePeopleSyncMutationClient()
    const response = await client.removeWorkspaceMember({
      memberId: "member-1",
      workspaceId: "workspace-123",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.internal:3001/api/workspaces/workspace-123/members/member-1",
      expect.objectContaining({
        credentials: "include",
        method: "DELETE",
      })
    )
    expect(response.syncConfirmation.txid).toBe("127")
    expect(response.memberId).toBe("member-1")
    delete document.documentElement.dataset.apiBaseUrl
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("exports the shared commands base path for future route mounting", () => {
    expect(workspacePeopleSyncCommandsBasePath).toBe("/api")
  })

  it("falls back to the response status when a json error body omits a message", async () => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    document.documentElement.dataset.apiBaseUrl = "https://api.example.com"

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          error: "invite_failed",
        },
        {
          status: 409,
        }
      )
    )

    const client = createWorkspacePeopleSyncMutationClient({
      apiBaseUrl: "https://api.example.com",
    })

    await expect(
      client.createWorkspaceInvite({
        email: "ada@example.com",
        role: "admin",
        workspaceId: "workspace-123",
      })
    ).rejects.toThrow("API request failed with status 409.")
    delete document.documentElement.dataset.apiBaseUrl
  })
})
