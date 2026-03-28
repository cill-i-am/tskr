import { workspaceBootstrapSchema } from '@/domains/workspaces/bootstrap/contracts/workspace-bootstrap';
import type { WorkspaceBootstrap } from '@/domains/workspaces/bootstrap/contracts/workspace-bootstrap';

import { getWorkspaceBootstrap } from "./workspace-bootstrap-client"

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
      id: "membership_123",
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

describe(workspaceBootstrapSchema, () => {
  it("accepts the auth bootstrap payload", () => {
    expect(workspaceBootstrapSchema.parse(bootstrapPayload)).toStrictEqual(
      bootstrapPayload
    )
  })
})

describe(getWorkspaceBootstrap, () => {
  it("loads workspace bootstrap from the auth service", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(Response.json(bootstrapPayload))

      await expect(getWorkspaceBootstrap()).resolves.toStrictEqual(
        bootstrapPayload
      )

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/bootstrap",
        {
          credentials: "include",
        }
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("returns null for an unauthorized auth response", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response("", { status: 401 }))

      await expect(getWorkspaceBootstrap()).resolves.toBeNull()
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects malformed bootstrap payloads", async () => {
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

      await expect(getWorkspaceBootstrap()).rejects.toThrow(
        "Invalid workspace bootstrap payload."
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects non-ok auth responses other than 401", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        new Response("upstream error", {
          status: 503,
          statusText: "Service Unavailable",
        })
      )

      await expect(getWorkspaceBootstrap()).rejects.toThrow(
        "Auth service request failed with status 503."
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })
})
