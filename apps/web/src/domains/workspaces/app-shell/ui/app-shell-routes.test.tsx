import type { SettingsAdminSnapshot } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { getSettingsSnapshot } from "@/domains/identity/settings-admin/infra/get-settings-snapshot"
import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { getWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client"
import { routeTree } from "@/routeTree.gen"
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"

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

const getWorkspaceBootstrapMock = vi.mocked(getWorkspaceBootstrap)
const getSettingsSnapshotMock = vi.mocked(getSettingsSnapshot)

const activeWorkspaceBootstrap: WorkspaceBootstrap = {
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
      role: "admin",
      slug: "field-team",
    },
  ],
  pendingInvites: [
    {
      email: "crew@example.com",
      expiresAt: "2026-04-04T09:00:00.000Z",
      id: "invite_123",
      role: "dispatcher",
      status: "pending",
      workspaceId: "workspace_789",
      workspaceName: "Logistics",
      workspaceSlug: "logistics",
    },
  ],
  recoveryState: "active_valid",
}

const activeSettingsSnapshot: SettingsAdminSnapshot = {
  accountProfile: {
    email: "owner@example.com",
    id: "account_123",
    image: null,
    name: "Ada Lovelace",
  },
  members: [
    {
      email: "owner@example.com",
      id: "member_123",
      image: null,
      isCurrentUser: true,
      name: "Ada Lovelace",
      permissions: {
        assignableRoles: ["admin", "dispatcher", "field_worker"],
        canChangeRole: false,
        canRemove: false,
      },
      role: "owner",
      userId: "user_123",
    },
  ],
  pendingInvites: [],
  permissions: {
    canEditWorkspaceProfile: true,
    canInviteRoles: ["owner", "admin", "dispatcher", "field_worker"],
    canManageInvites: true,
    canManageMembers: true,
  },
  viewerRole: "owner",
  workspaceProfile: {
    id: "workspace_123",
    logo: null,
    name: "Operations Control",
    slug: "operations-control",
  },
}

const withSettingsPermissions = (
  permissions: SettingsAdminSnapshot["permissions"]
): SettingsAdminSnapshot => ({
  ...activeSettingsSnapshot,
  permissions,
})

const withRecoveryState = (
  recoveryState: WorkspaceBootstrap["recoveryState"]
): WorkspaceBootstrap => ({
  ...activeWorkspaceBootstrap,
  activeWorkspace:
    recoveryState === "selection_required"
      ? null
      : activeWorkspaceBootstrap.activeWorkspace,
  recoveryState,
})

const withActiveWorkspaceRole = (
  role: NonNullable<WorkspaceBootstrap["activeWorkspace"]>["role"]
): WorkspaceBootstrap => {
  const { activeWorkspace } = activeWorkspaceBootstrap

  if (!activeWorkspace) {
    throw new Error("Expected an active workspace in the test bootstrap.")
  }

  return {
    ...activeWorkspaceBootstrap,
    activeWorkspace: {
      ...activeWorkspace,
      role,
    },
  }
}

const withoutActiveWorkspace = (): WorkspaceBootstrap => ({
  ...activeWorkspaceBootstrap,
  activeWorkspace: null,
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

const loadPath = async ({
  bootstrap,
  path,
}: {
  bootstrap: WorkspaceBootstrap | null
  path: string
}) => {
  prepareTestEnvironment()
  getWorkspaceBootstrapMock.mockResolvedValue(bootstrap)

  const router = createTestRouter(path)

  await act(async () => {
    await router.load()
  })

  return router
}

const renderPath = async ({
  bootstrap,
  path,
}: {
  bootstrap: WorkspaceBootstrap | null
  path: string
}) => {
  prepareTestEnvironment()
  getWorkspaceBootstrapMock.mockResolvedValue(bootstrap)

  const router = createTestRouter(path)

  await act(async () => {
    render(<RouterProvider router={router} />)
    await router.load()
  })

  return router
}

describe("workspace app shell routes", () => {
  it("redirects / to /login when the user is signed out", async () => {
    const router = await loadPath({
      bootstrap: null,
      path: "/",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login")
    })
  })

  it("redirects / to /onboarding when onboarding is required", async () => {
    const router = await loadPath({
      bootstrap: withRecoveryState("onboarding_required"),
      path: "/",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding")
    })
  })

  it("redirects / to /onboarding when workspace selection is required", async () => {
    const router = await loadPath({
      bootstrap: withRecoveryState("selection_required"),
      path: "/",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding")
    })
  })

  it("redirects / to /app when the active workspace is valid", async () => {
    const router = await loadPath({
      bootstrap: withRecoveryState("active_valid"),
      path: "/",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app")
    })
  })

  it("redirects / to /app when bootstrap auto-switches to a valid workspace", async () => {
    const router = await loadPath({
      bootstrap: withRecoveryState("auto_switched"),
      path: "/",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app")
    })
  })

  it("redirects direct /app visits to /login when the user is signed out", async () => {
    const router = await loadPath({
      bootstrap: null,
      path: "/app",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login")
    })
  })

  it("redirects direct /app visits to /onboarding when onboarding is required", async () => {
    const router = await loadPath({
      bootstrap: withRecoveryState("onboarding_required"),
      path: "/app",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding")
    })
  })

  it("redirects direct /onboarding visits to /app when workspace access is ready", async () => {
    const router = await loadPath({
      bootstrap: withRecoveryState("active_valid"),
      path: "/onboarding",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app")
    })
  })

  it("redirects direct /onboarding visits to /login when the user is signed out", async () => {
    const router = await loadPath({
      bootstrap: null,
      path: "/onboarding",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login")
    })
  })

  it("renders the app shell with active workspace details from shared bootstrap state", async () => {
    const router = await renderPath({
      bootstrap: withRecoveryState("active_valid"),
      path: "/app",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app")
    })

    await expect(
      screen.findByRole("heading", {
        name: "Operations Control",
      })
    ).resolves.toBeTruthy()
    expect(screen.getAllByText("2 memberships available")).toHaveLength(2)
    expect(screen.getByText("1 pending invite")).toBeTruthy()
  })

  it("adds a settings destination to the authenticated app shell", async () => {
    getSettingsSnapshotMock.mockResolvedValue(activeSettingsSnapshot)

    const router = await renderPath({
      bootstrap: withRecoveryState("active_valid"),
      path: "/app",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app")
    })

    screen.getByRole("link", { name: "Settings" }).click()

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/settings")
    })

    await expect(
      screen.findByRole("heading", {
        name: "Settings",
      })
    ).resolves.toBeTruthy()
  })

  it("loads the settings shell for workspace admins and fetches the snapshot", async () => {
    getSettingsSnapshotMock.mockResolvedValue(activeSettingsSnapshot)

    const router = await renderPath({
      bootstrap: withRecoveryState("active_valid"),
      path: "/app/settings",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/settings")
    })

    expect(getSettingsSnapshotMock).toHaveBeenCalledWith({
      workspaceId: "workspace_123",
    })
    await expect(
      screen.findByRole("heading", {
        name: "Settings",
      })
    ).resolves.toBeTruthy()
    expect(screen.getAllByText("Available now")).toHaveLength(2)
    expect(screen.getAllByText("Coming soon")).toHaveLength(2)
    expect(screen.getByRole("link", { name: "Workspace" })).toBeTruthy()
  })

  it("redirects non-admin visits to /app/settings back to account settings", async () => {
    const router = await renderPath({
      bootstrap: withActiveWorkspaceRole("dispatcher"),
      path: "/app/settings",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/settings/account")
    })

    expect(getSettingsSnapshotMock).not.toHaveBeenCalled()
    await expect(
      screen.findByRole("heading", {
        name: "Account settings",
      })
    ).resolves.toBeTruthy()
  })

  it("falls back to account settings when snapshot permissions remove admin access", async () => {
    getSettingsSnapshotMock.mockResolvedValue(
      withSettingsPermissions({
        canEditWorkspaceProfile: false,
        canInviteRoles: [],
        canManageInvites: false,
        canManageMembers: false,
      })
    )

    const router = await renderPath({
      bootstrap: withActiveWorkspaceRole("owner"),
      path: "/app/settings",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/settings/account")
    })

    expect(getSettingsSnapshotMock).toHaveBeenCalledWith({
      workspaceId: "workspace_123",
    })
    await expect(
      screen.findByRole("heading", {
        name: "Account settings",
      })
    ).resolves.toBeTruthy()
    expect(screen.queryByRole("link", { name: "Workspace" })).toBeNull()
    expect(screen.queryByRole("link", { name: "People" })).toBeNull()
  })

  it.each([
    {
      heading: "Workspace settings",
      path: "/app/settings/workspace",
    },
    {
      heading: "Labels",
      path: "/app/settings/labels",
    },
    {
      heading: "Service zones",
      path: "/app/settings/service-zones",
    },
    {
      heading: "Notifications",
      path: "/app/settings/notifications",
    },
  ])(
    "renders the admin settings route for $path",
    async ({ heading, path }) => {
      getSettingsSnapshotMock.mockResolvedValue(activeSettingsSnapshot)

      const router = await renderPath({
        bootstrap: withRecoveryState("active_valid"),
        path,
      })

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(path)
      })

      expect(getSettingsSnapshotMock).toHaveBeenCalledWith({
        workspaceId: "workspace_123",
      })
      await expect(
        screen.findByRole("heading", {
          name: heading,
        })
      ).resolves.toBeTruthy()
    }
  )

  it("renders people settings when the snapshot grants people-management access", async () => {
    getSettingsSnapshotMock.mockResolvedValue(activeSettingsSnapshot)

    const router = await renderPath({
      bootstrap: withActiveWorkspaceRole("admin"),
      path: "/app/settings/people",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/settings/people")
    })

    expect(getSettingsSnapshotMock).toHaveBeenCalledWith({
      workspaceId: "workspace_123",
    })
    await expect(
      screen.findByRole("heading", {
        name: "People settings",
      })
    ).resolves.toBeTruthy()
    await expect(screen.findByLabelText("Invite email")).resolves.toBeTruthy()
  })

  it("redirects people settings to account when snapshot permissions block people management", async () => {
    getSettingsSnapshotMock.mockResolvedValue(
      withSettingsPermissions({
        canEditWorkspaceProfile: true,
        canInviteRoles: [],
        canManageInvites: false,
        canManageMembers: false,
      })
    )

    const router = await renderPath({
      bootstrap: withActiveWorkspaceRole("owner"),
      path: "/app/settings/people",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/settings/account")
    })

    await expect(
      screen.findByRole("heading", {
        name: "Account settings",
      })
    ).resolves.toBeTruthy()
  })

  it("redirects settings visits to onboarding when no active workspace is selected", async () => {
    const router = await loadPath({
      bootstrap: withoutActiveWorkspace(),
      path: "/app/settings",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding")
    })

    expect(getSettingsSnapshotMock).not.toHaveBeenCalled()
  })

  it("keeps account settings reachable for members without loading the admin snapshot", async () => {
    const router = await renderPath({
      bootstrap: withActiveWorkspaceRole("dispatcher"),
      path: "/app/settings/account",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/settings/account")
    })

    expect(getSettingsSnapshotMock).not.toHaveBeenCalled()
    await expect(
      screen.findByRole("heading", {
        name: "Account settings",
      })
    ).resolves.toBeTruthy()
  })

  it("falls back to account settings when members visit admin-only settings routes", async () => {
    const router = await renderPath({
      bootstrap: withActiveWorkspaceRole("dispatcher"),
      path: "/app/settings/people",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/settings/account")
    })

    expect(getSettingsSnapshotMock).not.toHaveBeenCalled()
    await expect(
      screen.findByRole("heading", {
        name: "Account settings",
      })
    ).resolves.toBeTruthy()
  })

  it("renders the onboarding create-workspace page when no memberships exist", async () => {
    const router = await renderPath({
      bootstrap: withRecoveryState("onboarding_required"),
      path: "/onboarding",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding")
    })

    await expect(
      screen.findByRole("heading", {
        name: "Create your first workspace",
      })
    ).resolves.toBeTruthy()
    expect(screen.getByLabelText("Workspace name")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Create workspace" })
    ).toBeTruthy()
  })

  it("renders the onboarding recovery fallback when workspace selection is required", async () => {
    const router = await renderPath({
      bootstrap: withRecoveryState("selection_required"),
      path: "/onboarding",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding")
    })

    await expect(
      screen.findByRole("heading", {
        name: "Workspace selection is coming next",
      })
    ).resolves.toBeTruthy()
    expect(screen.queryByLabelText("Workspace name")).toBeNull()
    expect(screen.getByText("2 memberships discovered")).toBeTruthy()
  })
})
