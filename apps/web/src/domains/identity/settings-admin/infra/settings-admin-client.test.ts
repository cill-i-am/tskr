import {
  createWorkspaceInviteResponseSchema,
  settingsAdminAccountProfileSchema,
  settingsAdminCreateWorkspaceInviteRequestSchema,
  settingsAdminInviteSchema,
  settingsAdminMemberSchema,
  settingsAdminSnapshotSchema,
  settingsAdminUpdateAccountProfileRequestSchema,
  settingsAdminUpdateWorkspaceMemberRoleRequestSchema,
  settingsAdminUpdateWorkspaceMemberRoleResponseSchema,
  settingsAdminUpdateWorkspaceProfileRequestSchema,
  settingsAdminWorkspaceProfileSchema,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import type {
  SettingsAdminMember,
  SettingsAdminAccountProfile,
  SettingsAdminSnapshot,
  SettingsAdminUpdateWorkspaceMemberRoleResponse,
  SettingsAdminWorkspaceInvite,
  SettingsAdminWorkspaceProfile,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"

import { createWorkspaceInvite } from "./create-workspace-invite"
import { getAccountProfile } from "./get-account-profile"
import { getSettingsSnapshot } from "./get-settings-snapshot"
import { removeWorkspaceMember } from "./remove-workspace-member"
import { resendWorkspaceInvite } from "./resend-workspace-invite"
import { revokeWorkspaceInvite } from "./revoke-workspace-invite"
import { updateAccountProfile } from "./update-account-profile"
import { updateWorkspaceMemberRole } from "./update-workspace-member-role"
import { updateWorkspaceProfile } from "./update-workspace-profile"

const accountProfile = {
  email: "owner@example.com",
  id: "user_123",
  image: null,
  name: "Owner User",
} satisfies SettingsAdminAccountProfile

const workspaceProfile: SettingsAdminWorkspaceProfile = {
  id: "workspace_123",
  logo: null,
  name: "Ops Control",
  slug: "ops-control",
}

const member: SettingsAdminMember = {
  email: "dispatcher@example.com",
  id: "membership_123",
  image: null,
  isCurrentUser: false,
  name: "Dispatcher User",
  permissions: {
    assignableRoles: ["admin", "dispatcher", "field_worker"],
    canChangeRole: true,
    canRemove: true,
  },
  role: "dispatcher",
  userId: "user_456",
}

const invite: SettingsAdminWorkspaceInvite = {
  acceptUrl: "https://auth.example.com/accept?token=signed-token",
  code: "ABCD1234",
  email: "worker@example.com",
  id: "invite_123",
  permissions: {
    canResend: true,
    canRevoke: true,
  },
  role: "field_worker",
  status: "pending",
  workspaceId: "workspace_123",
}

const createInviteResponse = {
  acceptUrl: "https://auth.example.com/accept?token=signed-token",
  code: "ABCD1234",
  email: "worker@example.com",
  id: "invite_123",
  role: "field_worker",
  status: "pending",
  workspaceId: "workspace_123",
}

const snapshotPayload: SettingsAdminSnapshot = {
  accountProfile,
  members: [
    {
      ...member,
    },
  ],
  pendingInvites: [invite],
  permissions: {
    canEditWorkspaceProfile: true,
    canInviteRoles: ["owner", "admin", "dispatcher", "field_worker"],
    canManageInvites: true,
    canManageMembers: true,
  },
  viewerRole: "owner",
  workspaceProfile,
}

const roleUpdatePayload: SettingsAdminUpdateWorkspaceMemberRoleResponse = {
  memberId: "membership_123",
  role: "admin",
  workspaceId: "workspace_123",
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

describe("settings admin contract schema", () => {
  it("accepts the auth settings snapshot payload", () => {
    expect(settingsAdminSnapshotSchema.parse(snapshotPayload)).toStrictEqual(
      snapshotPayload
    )
  })

  it("accepts account and workspace settings schemas", () => {
    expect(
      settingsAdminUpdateAccountProfileRequestSchema.parse({
        image: null,
        name: "Owner User",
      })
    ).toStrictEqual({
      image: null,
      name: "Owner User",
    })
    expect(
      settingsAdminUpdateWorkspaceProfileRequestSchema.parse({
        logo: null,
        name: "Ops Control",
      })
    ).toStrictEqual({
      logo: null,
      name: "Ops Control",
    })
    expect(
      settingsAdminAccountProfileSchema.parse(accountProfile)
    ).toStrictEqual(accountProfile)
    expect(
      settingsAdminWorkspaceProfileSchema.parse(workspaceProfile)
    ).toStrictEqual(workspaceProfile)
  })

  it("accepts invite and role request schemas", () => {
    expect(
      settingsAdminCreateWorkspaceInviteRequestSchema.parse({
        email: "worker@example.com",
        role: "field_worker",
      })
    ).toStrictEqual({
      email: "worker@example.com",
      role: "field_worker",
    })
    expect(
      settingsAdminUpdateWorkspaceMemberRoleRequestSchema.parse({
        role: "dispatcher",
      })
    ).toStrictEqual({
      role: "dispatcher",
    })
  })

  it("accepts member and invite settings schemas", () => {
    expect(settingsAdminMemberSchema.parse(member)).toStrictEqual(member)
    expect(settingsAdminInviteSchema.parse(invite)).toStrictEqual(invite)
    expect(
      createWorkspaceInviteResponseSchema.parse(createInviteResponse)
    ).toStrictEqual(createInviteResponse)
    expect(
      settingsAdminUpdateWorkspaceMemberRoleResponseSchema.parse(
        roleUpdatePayload
      )
    ).toStrictEqual(roleUpdatePayload)
  })
})

describe("settings admin clients", () => {
  it("loads the authenticated account profile", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(Response.json(accountProfile))

      await expect(getAccountProfile()).resolves.toStrictEqual(accountProfile)

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/account/profile",
        {
          credentials: "include",
          headers: undefined,
        }
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects malformed account profile payloads when reading the account profile", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response("{", { status: 200 }))

      await expect(getAccountProfile()).rejects.toThrow(
        "Malformed account profile JSON."
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects schema-invalid account profile payloads when reading the account profile", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json({
          ...accountProfile,
          email: null,
        })
      )

      await expect(getAccountProfile()).rejects.toThrow(
        "Invalid account profile payload."
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("surfaces API error messages for failed account profile reads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            message: "Account settings are temporarily unavailable.",
          },
          {
            status: 503,
            statusText: "Service Unavailable",
          }
        )
      )

      await expect(getAccountProfile()).rejects.toThrow(
        "Account settings are temporarily unavailable."
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("loads the settings snapshot for an explicit workspace", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(Response.json(snapshotPayload))

      await expect(
        getSettingsSnapshot({
          workspaceId: "workspace_123",
        })
      ).resolves.toStrictEqual(snapshotPayload)

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/workspace_123/settings",
        {
          credentials: "include",
          headers: undefined,
        }
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects malformed settings snapshot payloads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response("{", { status: 200 }))

      await expect(
        getSettingsSnapshot({
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Malformed settings snapshot JSON.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects schema-invalid settings snapshot payloads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json({
          ...snapshotPayload,
          viewerRole: "super_admin",
        })
      )

      await expect(
        getSettingsSnapshot({
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Invalid settings snapshot payload.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("surfaces API error messages for failed settings snapshot reads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            message: "Workspace settings are temporarily unavailable.",
          },
          {
            status: 503,
            statusText: "Service Unavailable",
          }
        )
      )

      await expect(
        getSettingsSnapshot({
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Workspace settings are temporarily unavailable.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("updates the account profile", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json({
          ...accountProfile,
          image: "https://cdn.example.com/avatar.png",
          name: "Owner Operator",
        })
      )

      await expect(
        updateAccountProfile({
          image: "https://cdn.example.com/avatar.png",
          name: "Owner Operator",
        })
      ).resolves.toStrictEqual({
        ...accountProfile,
        image: "https://cdn.example.com/avatar.png",
        name: "Owner Operator",
      })

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/account/profile",
        expect.objectContaining({
          body: JSON.stringify({
            image: "https://cdn.example.com/avatar.png",
            name: "Owner Operator",
          }),
          credentials: "include",
          method: "PATCH",
        })
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("surfaces API error messages for account profile updates", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            message: "Profile updates are temporarily unavailable.",
          },
          {
            status: 503,
            statusText: "Service Unavailable",
          }
        )
      )

      await expect(
        updateAccountProfile({
          image: null,
          name: "Owner Operator",
        })
      ).rejects.toThrow("Profile updates are temporarily unavailable.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects malformed account profile payloads for account updates", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response("{", { status: 200 }))

      await expect(
        updateAccountProfile({
          image: null,
          name: "Owner Operator",
        })
      ).rejects.toThrow("Malformed account profile JSON.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects schema-invalid account profile payloads for account updates", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json({
          ...accountProfile,
          name: null,
        })
      )

      await expect(
        updateAccountProfile({
          image: null,
          name: "Owner Operator",
        })
      ).rejects.toThrow("Invalid account profile payload.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("updates the workspace profile for an explicit workspace", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json({
          ...workspaceProfile,
          logo: "https://cdn.example.com/logo.png",
          name: "Ops Control North",
        })
      )

      await expect(
        updateWorkspaceProfile({
          logo: "https://cdn.example.com/logo.png",
          name: "Ops Control North",
          workspaceId: "workspace_123",
        })
      ).resolves.toStrictEqual({
        ...workspaceProfile,
        logo: "https://cdn.example.com/logo.png",
        name: "Ops Control North",
      })

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/workspace_123/profile",
        expect.objectContaining({
          body: JSON.stringify({
            logo: "https://cdn.example.com/logo.png",
            name: "Ops Control North",
          }),
          credentials: "include",
          method: "PATCH",
        })
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects malformed workspace profile payloads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response("{", { status: 200 }))

      await expect(
        updateWorkspaceProfile({
          logo: null,
          name: "Ops Control North",
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Malformed workspace profile JSON.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects schema-invalid workspace profile payloads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json({
          ...workspaceProfile,
          slug: null,
        })
      )

      await expect(
        updateWorkspaceProfile({
          logo: null,
          name: "Ops Control North",
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Invalid workspace profile payload.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("surfaces API error messages for workspace profile updates", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            message: "Workspace profile updates are temporarily unavailable.",
          },
          {
            status: 503,
            statusText: "Service Unavailable",
          }
        )
      )

      await expect(
        updateWorkspaceProfile({
          logo: null,
          name: "Ops Control North",
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow(
        "Workspace profile updates are temporarily unavailable."
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("creates a workspace invite for an explicit workspace", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(Response.json(createInviteResponse))

      await expect(
        createWorkspaceInvite({
          email: "worker@example.com",
          role: "field_worker",
          workspaceId: "workspace_123",
        })
      ).resolves.toStrictEqual(createInviteResponse)

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/workspace_123/invites",
        expect.objectContaining({
          body: JSON.stringify({
            email: "worker@example.com",
            role: "field_worker",
          }),
          credentials: "include",
          method: "POST",
        })
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects schema-invalid workspace invite payloads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json({
          ...invite,
          role: "supervisor",
        })
      )

      await expect(
        createWorkspaceInvite({
          email: "worker@example.com",
          role: "field_worker",
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Invalid workspace invite payload.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects malformed workspace invite payloads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response("{", { status: 200 }))

      await expect(
        createWorkspaceInvite({
          email: "worker@example.com",
          role: "field_worker",
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Malformed workspace invite JSON.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("surfaces API error messages for failed workspace invite creation", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            message: "Workspace invite delivery is temporarily unavailable.",
          },
          {
            status: 503,
            statusText: "Service Unavailable",
          }
        )
      )

      await expect(
        createWorkspaceInvite({
          email: "worker@example.com",
          role: "field_worker",
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Workspace invite delivery is temporarily unavailable.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("resends a workspace invite for an explicit workspace", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

      await expect(
        resendWorkspaceInvite({
          inviteId: "invite_123",
          workspaceId: "workspace_123",
        })
      ).resolves.toBeUndefined()

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/workspace_123/invites/invite_123/resend",
        expect.objectContaining({
          credentials: "include",
          method: "POST",
        })
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("surfaces API error messages for workspace invite resend failures", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            message: "Workspace invite resend is temporarily unavailable.",
          },
          {
            status: 503,
            statusText: "Service Unavailable",
          }
        )
      )

      await expect(
        resendWorkspaceInvite({
          inviteId: "invite_123",
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Workspace invite resend is temporarily unavailable.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("revoke a workspace invite for an explicit workspace", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

      await expect(
        revokeWorkspaceInvite({
          inviteId: "invite_123",
          workspaceId: "workspace_123",
        })
      ).resolves.toBeUndefined()

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/workspace_123/invites/invite_123",
        expect.objectContaining({
          credentials: "include",
          method: "DELETE",
        })
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("surfaces API error messages for workspace invite revoke failures", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            message: "Workspace invite revocation is temporarily unavailable.",
          },
          {
            status: 503,
            statusText: "Service Unavailable",
          }
        )
      )

      await expect(
        revokeWorkspaceInvite({
          inviteId: "invite_123",
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow(
        "Workspace invite revocation is temporarily unavailable."
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("updates a workspace member role for an explicit workspace", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(Response.json(roleUpdatePayload))

      await expect(
        updateWorkspaceMemberRole({
          memberId: "membership_123",
          role: "admin",
          workspaceId: "workspace_123",
        })
      ).resolves.toStrictEqual(roleUpdatePayload)

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/workspace_123/members/membership_123/role",
        expect.objectContaining({
          body: JSON.stringify({
            role: "admin",
          }),
          credentials: "include",
          method: "PATCH",
        })
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects malformed workspace member role payloads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response("{", { status: 200 }))

      await expect(
        updateWorkspaceMemberRole({
          memberId: "membership_123",
          role: "admin",
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Malformed workspace member role JSON.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("rejects schema-invalid workspace member role payloads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json({
          ...roleUpdatePayload,
          role: "supervisor",
        })
      )

      await expect(
        updateWorkspaceMemberRole({
          memberId: "membership_123",
          role: "admin",
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Invalid workspace member role payload.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("surfaces API error messages for workspace member role updates", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            message: "Workspace role updates are temporarily unavailable.",
          },
          {
            status: 503,
            statusText: "Service Unavailable",
          }
        )
      )

      await expect(
        updateWorkspaceMemberRole({
          memberId: "membership_123",
          role: "admin",
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Workspace role updates are temporarily unavailable.")
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("removes a workspace member for an explicit workspace", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

      await expect(
        removeWorkspaceMember({
          memberId: "membership_123",
          workspaceId: "workspace_123",
        })
      ).resolves.toBeUndefined()

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/workspace_123/members/membership_123",
        expect.objectContaining({
          credentials: "include",
          method: "DELETE",
        })
      )
    } finally {
      withoutAuthServiceFetch()
    }
  })

  it("surfaces API error messages for workspace member removal failures", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            message: "Workspace member removal is temporarily unavailable.",
          },
          {
            status: 503,
            statusText: "Service Unavailable",
          }
        )
      )

      await expect(
        removeWorkspaceMember({
          memberId: "membership_123",
          workspaceId: "workspace_123",
        })
      ).rejects.toThrow("Workspace member removal is temporarily unavailable.")
    } finally {
      withoutAuthServiceFetch()
    }
  })
})
