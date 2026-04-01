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
