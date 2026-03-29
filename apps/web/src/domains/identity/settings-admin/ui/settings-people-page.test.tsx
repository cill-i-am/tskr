import type {
  SettingsAdminMember,
  SettingsAdminSnapshot,
  SettingsAdminWorkspaceInvite,
  SettingsAdminWorkspaceRole,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { createWorkspaceInvite } from "@/domains/identity/settings-admin/infra/create-workspace-invite"
import { getSettingsSnapshot } from "@/domains/identity/settings-admin/infra/get-settings-snapshot"
import { removeWorkspaceMember } from "@/domains/identity/settings-admin/infra/remove-workspace-member"
import { revokeWorkspaceInvite } from "@/domains/identity/settings-admin/infra/revoke-workspace-invite"
import { updateWorkspaceMemberRole } from "@/domains/identity/settings-admin/infra/update-workspace-member-role"
import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { getWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client"
import { routeTree } from "@/routeTree.gen"
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router"
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock(
  import("@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client"),
  () => ({
    getWorkspaceBootstrap: vi.fn(),
  })
)

vi.mock(
  import("@/domains/identity/settings-admin/infra/get-settings-snapshot"),
  () => ({
    getSettingsSnapshot: vi.fn(),
  })
)

vi.mock(
  import("@/domains/identity/settings-admin/infra/create-workspace-invite"),
  () => ({
    createWorkspaceInvite: vi.fn(),
  })
)

vi.mock(
  import("@/domains/identity/settings-admin/infra/update-workspace-member-role"),
  () => ({
    updateWorkspaceMemberRole: vi.fn(),
  })
)

vi.mock(
  import("@/domains/identity/settings-admin/infra/resend-workspace-invite"),
  () => ({
    resendWorkspaceInvite: vi.fn(),
  })
)

vi.mock(
  import("@/domains/identity/settings-admin/infra/revoke-workspace-invite"),
  () => ({
    revokeWorkspaceInvite: vi.fn(),
  })
)

vi.mock(
  import("@/domains/identity/settings-admin/infra/remove-workspace-member"),
  () => ({
    removeWorkspaceMember: vi.fn(),
  })
)

const getWorkspaceBootstrapMock = vi.mocked(getWorkspaceBootstrap)
const getSettingsSnapshotMock = vi.mocked(getSettingsSnapshot)
const createWorkspaceInviteMock = vi.mocked(createWorkspaceInvite)
const updateWorkspaceMemberRoleMock = vi.mocked(updateWorkspaceMemberRole)
const revokeWorkspaceInviteMock = vi.mocked(revokeWorkspaceInvite)
const removeWorkspaceMemberMock = vi.mocked(removeWorkspaceMember)

const workspaceId = "workspace_123"

const makeMember = ({
  email,
  id,
  isCurrentUser = false,
  name,
  permissions,
  role,
  userId,
}: {
  email: string
  id: string
  isCurrentUser?: boolean
  name: string
  permissions: SettingsAdminMember["permissions"]
  role: SettingsAdminWorkspaceRole
  userId: string
}): SettingsAdminMember => ({
  email,
  id,
  image: null,
  isCurrentUser,
  name,
  permissions,
  role,
  userId,
})

const makeInvite = ({
  email,
  id,
  permissions,
  role,
}: {
  email: string
  id: string
  permissions: SettingsAdminWorkspaceInvite["permissions"]
  role: SettingsAdminWorkspaceRole
}): SettingsAdminWorkspaceInvite => ({
  acceptUrl: `https://example.com/invites/${id}`,
  code: `${id}_code`,
  email,
  id,
  permissions,
  role,
  status: "pending",
  workspaceId,
})

const ownerBootstrap: WorkspaceBootstrap = {
  activeWorkspace: {
    id: workspaceId,
    logo: null,
    name: "Operations Control",
    role: "owner",
    slug: "operations-control",
  },
  memberships: [
    {
      id: workspaceId,
      logo: null,
      name: "Operations Control",
      role: "owner",
      slug: "operations-control",
    },
  ],
  pendingInvites: [],
  recoveryState: "active_valid",
}

const bootstrapWithRole = (
  role: NonNullable<WorkspaceBootstrap["activeWorkspace"]>["role"]
): WorkspaceBootstrap => {
  const { activeWorkspace } = ownerBootstrap

  if (!activeWorkspace) {
    throw new Error("Expected an active workspace in the test bootstrap.")
  }

  return {
    ...ownerBootstrap,
    activeWorkspace: {
      ...activeWorkspace,
      role,
    },
  }
}

const createSnapshot = ({
  members,
  pendingInvites,
  permissions,
  viewerRole,
}: {
  members: SettingsAdminMember[]
  pendingInvites: SettingsAdminWorkspaceInvite[]
  permissions: SettingsAdminSnapshot["permissions"]
  viewerRole: SettingsAdminWorkspaceRole
}): SettingsAdminSnapshot => ({
  accountProfile: {
    email: "viewer@example.com",
    id: "account_123",
    image: null,
    name: "Viewer Person",
  },
  members,
  pendingInvites,
  permissions,
  viewerRole,
  workspaceProfile: {
    id: workspaceId,
    logo: null,
    name: "Operations Control",
    slug: "operations-control",
  },
})

const ownerSnapshot = () =>
  createSnapshot({
    members: [
      makeMember({
        email: "owner@example.com",
        id: "member_owner",
        isCurrentUser: true,
        name: "Ada Lovelace",
        permissions: {
          assignableRoles: [],
          canChangeRole: false,
          canRemove: false,
        },
        role: "owner",
        userId: "user_owner",
      }),
      makeMember({
        email: "admin@example.com",
        id: "member_admin",
        name: "Grace Hopper",
        permissions: {
          assignableRoles: ["owner", "admin", "dispatcher", "field_worker"],
          canChangeRole: true,
          canRemove: true,
        },
        role: "admin",
        userId: "user_admin",
      }),
      makeMember({
        email: "dispatcher@example.com",
        id: "member_dispatcher",
        name: "Alex Dispatcher",
        permissions: {
          assignableRoles: ["admin", "dispatcher", "field_worker"],
          canChangeRole: true,
          canRemove: true,
        },
        role: "dispatcher",
        userId: "user_dispatcher",
      }),
    ],
    pendingInvites: [
      makeInvite({
        email: "pending-owner@example.com",
        id: "invite_owner",
        permissions: {
          canResend: true,
          canRevoke: true,
        },
        role: "owner",
      }),
      makeInvite({
        email: "locked-field@example.com",
        id: "invite_locked",
        permissions: {
          canResend: false,
          canRevoke: false,
        },
        role: "field_worker",
      }),
    ],
    permissions: {
      canEditWorkspaceProfile: true,
      canInviteRoles: ["owner", "admin", "dispatcher", "field_worker"],
      canManageInvites: true,
      canManageMembers: true,
    },
    viewerRole: "owner",
  })

const adminSnapshot = () =>
  createSnapshot({
    members: [
      makeMember({
        email: "owner@example.com",
        id: "member_owner",
        name: "Ada Lovelace",
        permissions: {
          assignableRoles: [],
          canChangeRole: false,
          canRemove: false,
        },
        role: "owner",
        userId: "user_owner",
      }),
      makeMember({
        email: "admin@example.com",
        id: "member_admin",
        isCurrentUser: true,
        name: "Grace Hopper",
        permissions: {
          assignableRoles: [],
          canChangeRole: false,
          canRemove: true,
        },
        role: "admin",
        userId: "user_admin",
      }),
      makeMember({
        email: "dispatcher@example.com",
        id: "member_dispatcher",
        name: "Alex Dispatcher",
        permissions: {
          assignableRoles: ["admin", "dispatcher", "field_worker"],
          canChangeRole: true,
          canRemove: true,
        },
        role: "dispatcher",
        userId: "user_dispatcher",
      }),
    ],
    pendingInvites: [
      makeInvite({
        email: "dispatch@example.com",
        id: "invite_dispatch",
        permissions: {
          canResend: true,
          canRevoke: true,
        },
        role: "dispatcher",
      }),
      makeInvite({
        email: "owner-invite@example.com",
        id: "invite_owner",
        permissions: {
          canResend: false,
          canRevoke: false,
        },
        role: "owner",
      }),
    ],
    permissions: {
      canEditWorkspaceProfile: false,
      canInviteRoles: ["admin", "dispatcher", "field_worker"],
      canManageInvites: true,
      canManageMembers: true,
    },
    viewerRole: "admin",
  })

let currentSnapshot: SettingsAdminSnapshot

const withMemberRole = (
  snapshot: SettingsAdminSnapshot,
  memberId: string,
  role: SettingsAdminWorkspaceRole
): SettingsAdminSnapshot => ({
  ...snapshot,
  members: snapshot.members.map((member) => {
    if (member.id === memberId) {
      return {
        ...member,
        role,
      }
    }

    return member
  }),
})

const withoutInvite = (
  snapshot: SettingsAdminSnapshot,
  inviteId: string
): SettingsAdminSnapshot => ({
  ...snapshot,
  pendingInvites: snapshot.pendingInvites.filter(
    (invite) => invite.id !== inviteId
  ),
})

const withRemovableMember = (
  snapshot: SettingsAdminSnapshot,
  memberId: string
): SettingsAdminSnapshot => ({
  ...snapshot,
  members: snapshot.members.map((member) => {
    if (member.id === memberId) {
      return {
        ...member,
        permissions: {
          ...member.permissions,
          canRemove: true,
        },
      }
    }

    return member
  }),
})

const createTestRouter = (path: string) =>
  createRouter({
    defaultErrorComponent: ({ error }) => (
      <pre>{error instanceof Error ? error.message : "Unknown error"}</pre>
    ),
    defaultNotFoundComponent: () => <p>Not found</p>,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    history: createMemoryHistory({
      initialEntries: [path],
    }),
    routeTree,
    scrollRestoration: false,
  })

const prepareTestEnvironment = () => {
  cleanup()
  vi.clearAllMocks()

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
    writable: true,
  })
}

const renderPeopleRoute = async ({
  bootstrap = ownerBootstrap,
  snapshot = ownerSnapshot(),
}: {
  bootstrap?: WorkspaceBootstrap | null
  snapshot?: SettingsAdminSnapshot
} = {}) => {
  prepareTestEnvironment()
  currentSnapshot = snapshot
  getWorkspaceBootstrapMock.mockResolvedValue(bootstrap)
  getSettingsSnapshotMock.mockImplementation(async () => currentSnapshot)

  const router = createTestRouter("/app/settings/people")

  await act(async () => {
    render(<RouterProvider router={router} />)
    await router.load()
  })

  return {
    router,
    user: userEvent.setup(),
  }
}

describe("people settings page", () => {
  it("lets owners invite owner roles and refreshes the snapshot after success", async () => {
    const nextInvite = makeInvite({
      email: "new-owner@example.com",
      id: "invite_new_owner",
      permissions: {
        canResend: true,
        canRevoke: true,
      },
      role: "owner",
    })

    createWorkspaceInviteMock.mockImplementation(async (input) => {
      currentSnapshot = {
        ...currentSnapshot,
        pendingInvites: [...currentSnapshot.pendingInvites, nextInvite],
      }

      return {
        ...nextInvite,
        email: input.email,
        role: input.role,
      }
    })

    const { user } = await renderPeopleRoute()
    const inviteForm = screen.getByRole("form", {
      name: "Invite member",
    })

    expect(within(inviteForm).getByLabelText("Invite email")).toBeTruthy()
    expect(
      [
        ...(
          within(inviteForm).getByLabelText("Invite role") as HTMLSelectElement
        ).options,
      ].some((option) => option.text === "Owner")
    ).toBeTruthy()

    await user.type(
      within(inviteForm).getByLabelText("Invite email"),
      "new-owner@example.com"
    )
    await user.selectOptions(
      within(inviteForm).getByLabelText("Invite role"),
      "owner"
    )
    await user.click(
      within(inviteForm).getByRole("button", {
        name: "Send invite",
      })
    )

    await waitFor(() => {
      expect(createWorkspaceInviteMock).toHaveBeenCalledWith({
        email: "new-owner@example.com",
        role: "owner",
        workspaceId,
      })
    })
    await waitFor(() => {
      expect(screen.getByText("new-owner@example.com")).toBeTruthy()
    })
  })

  it("lets owners change member roles and gates pending invite actions by row permissions", async () => {
    updateWorkspaceMemberRoleMock.mockImplementation(async (input) => {
      currentSnapshot = withMemberRole(
        currentSnapshot,
        input.memberId,
        input.role
      )

      return {
        memberId: input.memberId,
        role: input.role,
        workspaceId: input.workspaceId,
      }
    })
    revokeWorkspaceInviteMock.mockImplementation(async ({ inviteId }) => {
      currentSnapshot = withoutInvite(currentSnapshot, inviteId)
    })

    const { user } = await renderPeopleRoute()
    const adminRow = screen.getByRole("row", { name: /grace hopper/i })
    const lockedInviteRow = screen.getByRole("row", {
      name: /locked-field@example.com/i,
    })

    expect(
      within(adminRow).getByRole("option", {
        name: "Owner",
      })
    ).toBeTruthy()
    expect(
      within(lockedInviteRow).queryByRole("button", {
        name: "Resend invite to locked-field@example.com",
      })
    ).toBeNull()
    expect(
      within(lockedInviteRow).queryByRole("button", {
        name: "Revoke invite for locked-field@example.com",
      })
    ).toBeNull()

    await user.selectOptions(
      within(adminRow).getByLabelText("Role for Grace Hopper"),
      "owner"
    )
    await user.click(
      within(adminRow).getByRole("button", {
        name: "Save role for Grace Hopper",
      })
    )

    await waitFor(() => {
      expect(updateWorkspaceMemberRoleMock).toHaveBeenCalledWith({
        memberId: "member_admin",
        role: "owner",
        workspaceId,
      })
    })
    await waitFor(() => {
      expect(
        (within(adminRow).getByLabelText(
          "Role for Grace Hopper"
        ) as HTMLSelectElement).value
      ).toBe("owner")
    })

    await user.click(
      screen.getByRole("button", {
        name: "Revoke invite for pending-owner@example.com",
      })
    )

    await waitFor(() => {
      expect(revokeWorkspaceInviteMock).toHaveBeenCalledWith({
        inviteId: "invite_owner",
        workspaceId,
      })
    })
    await waitFor(() => {
      expect(screen.queryByText("pending-owner@example.com")).toBeNull()
    })
  })

  it("prevents admins from issuing or assigning owner access while still allowing non-owner role changes", async () => {
    updateWorkspaceMemberRoleMock.mockImplementation(async (input) => {
      currentSnapshot = withMemberRole(
        currentSnapshot,
        input.memberId,
        input.role
      )

      return {
        memberId: input.memberId,
        role: input.role,
        workspaceId: input.workspaceId,
      }
    })

    const { user } = await renderPeopleRoute({
      bootstrap: bootstrapWithRole("admin"),
      snapshot: adminSnapshot(),
    })
    const ownerRow = screen.getByRole("row", { name: /ada lovelace/i })
    const dispatcherRow = screen.getByRole("row", { name: /alex dispatcher/i })

    expect(
      screen.queryByRole("option", {
        name: "Owner",
      })
    ).toBeNull()
    expect(
      within(ownerRow).queryByLabelText("Role for Ada Lovelace")
    ).toBeNull()
    expect(
      within(ownerRow).queryByRole("button", {
        name: "Remove Ada Lovelace",
      })
    ).toBeNull()
    expect(
      within(dispatcherRow).queryByRole("option", {
        name: "Owner",
      })
    ).toBeNull()

    await user.selectOptions(
      within(dispatcherRow).getByLabelText("Role for Alex Dispatcher"),
      "admin"
    )
    await user.click(
      within(dispatcherRow).getByRole("button", {
        name: "Save role for Alex Dispatcher",
      })
    )

    await waitFor(() => {
      expect(updateWorkspaceMemberRoleMock).toHaveBeenCalledWith({
        memberId: "member_dispatcher",
        role: "admin",
        workspaceId,
      })
    })
  })

  it.each(["dispatcher", "field_worker"] as const)(
    "redirects %s viewers away from people settings so they never see workspace-admin actions",
    async (role) => {
      const { router } = await renderPeopleRoute({
        bootstrap: bootstrapWithRole(role),
      })

      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/app/settings/account")
      })
      expect(getSettingsSnapshotMock).not.toHaveBeenCalled()
    }
  )

  it("shows the backend error when a member tries to leave the workspace and removal fails", async () => {
    removeWorkspaceMemberMock.mockRejectedValue(
      new Error("You cannot leave the workspace while dispatches are assigned.")
    )

    const { user } = await renderPeopleRoute({
      bootstrap: bootstrapWithRole("admin"),
      snapshot: adminSnapshot(),
    })

    await user.click(screen.getByRole("button", { name: "Leave workspace" }))

    await waitFor(() => {
      expect(removeWorkspaceMemberMock).toHaveBeenCalledWith({
        memberId: "member_admin",
        workspaceId,
      })
    })
    await waitFor(() => {
      expect(
        screen.getByText(
          "You cannot leave the workspace while dispatches are assigned."
        )
      ).toBeTruthy()
    })
  })

  it("shows the backend error when the last owner cannot leave the workspace", async () => {
    removeWorkspaceMemberMock.mockRejectedValue(
      new Error("Transfer ownership before leaving the workspace.")
    )

    const { user } = await renderPeopleRoute({
      snapshot: withRemovableMember(ownerSnapshot(), "member_owner"),
    })

    await user.click(screen.getByRole("button", { name: "Leave workspace" }))

    await waitFor(() => {
      expect(removeWorkspaceMemberMock).toHaveBeenCalledWith({
        memberId: "member_owner",
        workspaceId,
      })
    })
    await waitFor(() => {
      expect(
        screen.getByText("Transfer ownership before leaving the workspace.")
      ).toBeTruthy()
    })
  })
})
