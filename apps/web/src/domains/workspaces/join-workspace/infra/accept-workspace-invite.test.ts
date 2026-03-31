import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import {
  persistWorkspaceInviteFlow,
  readPendingWorkspaceInviteFlow,
} from "@/domains/workspaces/join-workspace/ui/workspace-invite-flow"

import { acceptWorkspaceInvite } from "./accept-workspace-invite"

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

describe("accept workspace invite client", () => {
  it("accepts a workspace invite by code", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(Response.json(bootstrapPayload))

      await expect(
        acceptWorkspaceInvite({
          code: "ABCD1234",
        })
      ).resolves.toStrictEqual(bootstrapPayload)

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/invites/accept",
        expect.objectContaining({
          body: JSON.stringify({
            code: "ABCD1234",
          }),
          credentials: "include",
          headers: expect.any(Headers),
          method: "POST",
        })
      )
      const headers = fetchMock.mock.calls[0]?.[1]?.headers

      expect(headers).toBeInstanceOf(Headers)
      expect((headers as Headers).get("Content-Type")).toBe("application/json")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("accepts a workspace invite by token", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(Response.json(bootstrapPayload))

      await expect(
        acceptWorkspaceInvite({
          token: "signed-token",
        })
      ).resolves.toStrictEqual(bootstrapPayload)

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/invites/accept",
        expect.objectContaining({
          body: JSON.stringify({
            token: "signed-token",
          }),
          credentials: "include",
          headers: expect.any(Headers),
          method: "POST",
        })
      )
      const headers = fetchMock.mock.calls[0]?.[1]?.headers

      expect(headers).toBeInstanceOf(Headers)
      expect((headers as Headers).get("Content-Type")).toBe("application/json")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects workspace invite payloads with both identifiers", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      await expect(
        acceptWorkspaceInvite({
          code: "ABCD1234",
          token: "signed-token",
        } as never)
      ).rejects.toThrow(
        "Join workspace invite input must include exactly one invite identifier."
      )

      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects malformed workspace invite acceptance JSON", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response("{", { status: 200 }))

      await expect(
        acceptWorkspaceInvite({
          code: "ABCD1234",
        })
      ).rejects.toThrow("Malformed workspace invite acceptance JSON.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects schema-invalid workspace bootstrap payloads", async () => {
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
        acceptWorkspaceInvite({
          token: "signed-token",
        })
      ).rejects.toThrow("Invalid workspace invite acceptance payload.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it.each([
    "Invite has been revoked.",
    "Invite is invalid.",
    "Invite has already been used.",
  ])("surfaces auth service messages for %s", async (message) => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            message,
          },
          {
            status: 409,
          }
        )
      )

      await expect(
        acceptWorkspaceInvite({
          code: "ABCD1234",
        })
      ).rejects.toThrow(message)
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("surfaces plain-text auth service messages", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        new Response("You are not the recipient of that invite.", {
          status: 403,
        })
      )

      await expect(
        acceptWorkspaceInvite({
          token: "signed-token",
        })
      ).rejects.toThrow("You are not the recipient of that invite.")
    } finally {
      withoutAuthServiceFetch()
    }
  })
})

describe("workspace invite flow helper", () => {
  it("persists and reads a single invite code", () => {
    window.sessionStorage.clear()

    persistWorkspaceInviteFlow({
      code: "ABCD1234",
    })

    expect(readPendingWorkspaceInviteFlow()).toStrictEqual({
      code: "ABCD1234",
    })
  })

  it("rejects workspace invite flows with both identifiers", () => {
    window.sessionStorage.clear()

    expect(() =>
      persistWorkspaceInviteFlow({
        code: "ABCD1234",
        token: "signed-token",
      } as never)
    ).toThrow(
      "Join workspace invite flow must include exactly one invite identifier."
    )

    expect(readPendingWorkspaceInviteFlow()).toBeNull()
  })
})
