import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"

import { createWorkspace } from "./create-workspace-client"

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

describe("create workspace client", () => {
  it("posts the workspace name and returns the bootstrap payload", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(Response.json(bootstrapPayload))

      await expect(
        createWorkspace({
          name: "Operations Control",
        })
      ).resolves.toStrictEqual(bootstrapPayload)

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces",
        expect.objectContaining({
          body: JSON.stringify({
            name: "Operations Control",
          }),
          credentials: "include",
          method: "POST",
        })
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects malformed workspace creation payloads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response("{", { status: 200 }))

      await expect(
        createWorkspace({
          name: "Operations Control",
        })
      ).rejects.toThrow("Malformed workspace creation JSON.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects schema-invalid workspace creation payloads", async () => {
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
        createWorkspace({
          name: "Operations Control",
        })
      ).rejects.toThrow("Invalid workspace creation payload.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("surfaces API error messages for failed workspace creation", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            message: "Workspace creation is unavailable right now.",
          },
          {
            status: 503,
            statusText: "Service Unavailable",
          }
        )
      )

      await expect(
        createWorkspace({
          name: "Operations Control",
        })
      ).rejects.toThrow("Workspace creation is unavailable right now.")
    } finally {
      withoutAuthServiceFetch()
    }
  })
})
