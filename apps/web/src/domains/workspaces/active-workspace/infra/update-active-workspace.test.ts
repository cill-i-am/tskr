import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"

import { updateActiveWorkspace } from "./update-active-workspace"

const bootstrapPayload: WorkspaceBootstrap = {
  activeWorkspace: {
    id: "workspace_123",
    logo: null,
    name: "Operations Control",
    role: "owner",
    slug: "operations-control",
  },
  memberships: [
    {
      id: "workspace_123",
      logo: null,
      name: "Operations Control",
      role: "owner",
      slug: "operations-control",
    },
    {
      id: "workspace_456",
      logo: null,
      name: "Field Team",
      role: "dispatcher",
      slug: "field-team",
    },
  ],
  pendingInvites: [],
  recoveryState: "active_valid",
}

const withAuthServiceFetch = () => {
  const fetchMock = vi.fn()

  vi.stubGlobal("fetch", fetchMock)
  document.documentElement.dataset.authBaseUrl = "https://auth.example.com"

  return fetchMock
}

const withoutAuthServiceFetch = () => {
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.authBaseUrl
}

describe("update active workspace client", () => {
  it("sends the workspace id and returns the bootstrap payload", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(Response.json(bootstrapPayload))

      await expect(
        updateActiveWorkspace({
          workspaceId: "workspace_456",
        })
      ).resolves.toStrictEqual(bootstrapPayload)

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/active",
        expect.objectContaining({
          body: JSON.stringify({
            workspaceId: "workspace_456",
          }),
          credentials: "include",
          method: "PUT",
        })
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("sends null workspace ids and returns a selection_required bootstrap", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      const selectionRequiredPayload: WorkspaceBootstrap = {
        activeWorkspace: null,
        memberships: bootstrapPayload.memberships,
        pendingInvites: [],
        recoveryState: "selection_required",
      }

      fetchMock.mockResolvedValue(Response.json(selectionRequiredPayload))

      await expect(
        updateActiveWorkspace({
          workspaceId: null,
        })
      ).resolves.toStrictEqual(selectionRequiredPayload)

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/active",
        expect.objectContaining({
          body: JSON.stringify({
            workspaceId: null,
          }),
          credentials: "include",
          method: "PUT",
        })
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("surfaces backend error messages", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            message: "That workspace is no longer available.",
          },
          {
            status: 403,
            statusText: "Forbidden",
          }
        )
      )

      await expect(
        updateActiveWorkspace({
          workspaceId: "workspace_456",
        })
      ).rejects.toThrow("That workspace is no longer available.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects malformed workspace switch JSON", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response("{", { status: 200 }))

      await expect(
        updateActiveWorkspace({
          workspaceId: "workspace_456",
        })
      ).rejects.toThrow("Malformed active workspace JSON.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects schema-invalid workspace switch payloads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json({
          activeWorkspace: null,
          memberships: [],
          pendingInvites: [],
          recoveryState: "not-a-real-state",
        })
      )

      await expect(
        updateActiveWorkspace({
          workspaceId: "workspace_456",
        })
      ).rejects.toThrow("Invalid active workspace payload.")
    } finally {
      withoutAuthServiceFetch()
    }
  })
})
