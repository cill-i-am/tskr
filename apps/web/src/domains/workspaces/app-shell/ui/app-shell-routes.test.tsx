import type { SettingsAdminSnapshot } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { getAccountProfile } from "@/domains/identity/settings-admin/infra/get-account-profile"
import { getSettingsSnapshot } from "@/domains/identity/settings-admin/infra/get-settings-snapshot"
import { updateActiveWorkspace } from "@/domains/workspaces/active-workspace/infra/update-active-workspace"
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
  import("@/domains/identity/settings-admin/infra/get-account-profile"),
  () => ({
    getAccountProfile: vi.fn(),
  })
)

vi.mock(
  import("@/domains/identity/settings-admin/infra/get-settings-snapshot"),
  () => ({
    getSettingsSnapshot: vi.fn(),
  })
)

vi.mock(
  import("@/domains/workspaces/active-workspace/infra/update-active-workspace"),
  () => ({
    updateActiveWorkspace: vi.fn(),
  })
)

const getWorkspaceBootstrapMock = vi.mocked(getWorkspaceBootstrap)
const getAccountProfileMock = vi.mocked(getAccountProfile)
const getSettingsSnapshotMock = vi.mocked(getSettingsSnapshot)
const updateActiveWorkspaceMock = vi.mocked(updateActiveWorkspace)

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

const switchedWorkspaceBootstrap: WorkspaceBootstrap = {
  ...activeWorkspaceBootstrap,
  activeWorkspace: {
    id: "workspace_456",
    logo: null,
    name: "Field Team",
    role: "admin",
    slug: "field-team",
  },
  recoveryState: "active_valid",
}

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

const settingsAdminNavigationLinks = [
  ["Account", "/app/settings/account"],
  ["Workspace", "/app/settings/workspace"],
  ["People", "/app/settings/people"],
  ["Labels", "/app/settings/labels"],
  ["Service zones", "/app/settings/service-zones"],
  ["Notifications", "/app/settings/notifications"],
] as const

const expectSettingsNavigationLinks = (
  links: readonly (readonly [name: string, href: string])[]
) => {
  expect(
    links.map(([name]) =>
      screen
        .getByRole("link", {
          name,
        })
        .getAttribute("href")
    )
  ).toStrictEqual(links.map(([, href]) => href))
}

const expectAccountSettingsPage = () => {
  expect(
    screen.getByRole("heading", {
      name: "Account settings",
    })
  ).toBeTruthy()
  expect(screen.getByLabelText("Name")).toBeTruthy()
  expect(
    screen.getByRole("button", {
      name: "Save account profile",
    })
  ).toBeTruthy()
  expectSettingsNavigationLinks([settingsAdminNavigationLinks[0]])
  expect(
    ["Workspace", "People"].every(
      (name) => screen.queryByRole("link", { name }) === null
    )
  ).toBeTruthy()
}

const expectAdminSettingsNavigation = () => {
  expectSettingsNavigationLinks(settingsAdminNavigationLinks)
  expect(
    ["Available now", "Coming soon"].every(
      (text) => screen.getByText(text) !== null
    )
  ).toBeTruthy()
}

const expectWorkspaceSettingsPage = () => {
  expect(
    screen.getByRole("heading", {
      name: "Workspace settings",
    })
  ).toBeTruthy()
  expect(screen.getByLabelText("Workspace name")).toBeTruthy()
  expect(screen.getByLabelText("Logo URL")).toBeTruthy()
  expect(
    screen.getByRole("button", {
      name: "Save workspace profile",
    })
  ).toBeTruthy()
  expectSettingsNavigationLinks(settingsAdminNavigationLinks)
}

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
  getAccountProfileMock.mockResolvedValue(activeSettingsSnapshot.accountProfile)

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
  getAccountProfileMock.mockResolvedValue(activeSettingsSnapshot.accountProfile)

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

    expect(
      screen.getByRole("heading", {
        name: "Operations Control",
      })
    ).toBeTruthy()
    expect(screen.getAllByText("2 memberships available")).toHaveLength(2)
    expect(screen.getByText("1 pending invite")).toBeTruthy()
  })

  it("opens the workspace switcher from the authenticated shell and lists memberships with pending invites", async () => {
    const user = userEvent.setup()
    prepareTestEnvironment()
    getWorkspaceBootstrapMock.mockResolvedValue(
      withRecoveryState("active_valid")
    )

    const router = createTestRouter("/app")

    const view = await act(async () => {
      const rendered = render(<RouterProvider router={router} />)
      await router.load()
      return rendered
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app")
    })

    await user.click(
      screen.getByRole("button", {
        name: /Switch workspace/,
      })
    )

    await screen.findByText("Pending invites")
    const switcher = document.querySelector(
      "[data-workspace-switcher-panel]"
    ) as HTMLElement | null

    expect(switcher).toBeTruthy()
    const switcherText = String((switcher as HTMLElement).textContent)
    expect(
      [
        "Operations Control",
        "Field Team",
        "Logistics",
        "Owner",
        "Admin",
        "Dispatcher",
        "Pending invites",
      ].every((text) => switcherText.includes(text))
    ).toBeTruthy()
    expect(
      within(switcher as HTMLElement).getByText("Active workspace", {
        selector: "span",
      })
    ).toBeTruthy()

    await user.click(
      screen.getByRole("button", {
        name: /Switch workspace/,
      })
    )

    await waitFor(() => {
      expect(screen.queryByText("Pending invites")).toBeNull()
    })

    view.unmount()
  })

  it("switches to another workspace and refreshes the shell from bootstrap state", async () => {
    const user = userEvent.setup()
    prepareTestEnvironment()
    getWorkspaceBootstrapMock.mockResolvedValue(activeWorkspaceBootstrap)
    updateActiveWorkspaceMock.mockImplementation(() => {
      getWorkspaceBootstrapMock.mockResolvedValue(switchedWorkspaceBootstrap)

      return Promise.resolve(switchedWorkspaceBootstrap)
    })

    const router = createTestRouter("/app")

    await act(async () => {
      render(<RouterProvider router={router} />)
      await router.load()
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app")
    })

    await user.click(
      screen.getByRole("button", {
        name: /Switch workspace/,
      })
    )

    await screen.findByText("Pending invites")

    const fieldTeamRow = document.querySelector(
      '[data-workspace-entry="workspace_456"]'
    ) as HTMLElement | null

    expect(fieldTeamRow).toBeTruthy()

    const switchAction = within(fieldTeamRow as HTMLElement).getByRole(
      "button",
      {
        name: "Switch to Field Team",
      }
    )

    expect((switchAction as HTMLButtonElement).disabled).toBeFalsy()

    await user.click(switchAction)

    await waitFor(() => {
      expect(updateActiveWorkspaceMock).toHaveBeenCalledWith({
        workspaceId: "workspace_456",
      })
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app")
    })

    await expect(
      screen.findByRole("heading", {
        name: "Field Team",
      })
    ).resolves.toBeTruthy()
    expect(screen.getAllByText("Field Team")).not.toHaveLength(0)
  })

  it("keeps the workspace switcher open and announces an error when switching fails", async () => {
    const user = userEvent.setup()
    prepareTestEnvironment()
    getWorkspaceBootstrapMock.mockResolvedValue(activeWorkspaceBootstrap)
    updateActiveWorkspaceMock.mockRejectedValue(
      new Error("Unable to switch to Field Team right now.")
    )

    const router = createTestRouter("/app")

    await act(async () => {
      render(<RouterProvider router={router} />)
      await router.load()
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app")
    })

    await user.click(
      screen.getByRole("button", {
        name: /Switch workspace/,
      })
    )

    await screen.findByText("Pending invites")

    const fieldTeamRow = document.querySelector(
      '[data-workspace-entry="workspace_456"]'
    ) as HTMLElement | null

    expect(fieldTeamRow).toBeTruthy()

    await user.click(
      within(fieldTeamRow as HTMLElement).getByRole("button", {
        name: "Switch to Field Team",
      })
    )

    await waitFor(() => {
      expect(updateActiveWorkspaceMock).toHaveBeenCalledWith({
        workspaceId: "workspace_456",
      })
    })

    expect(screen.getByText("Pending invites")).toBeTruthy()
    expect(
      screen.getByRole("alert", {
        name: "",
      })
    ).toBeTruthy()
    expect(
      screen.getByText("Unable to switch to Field Team right now.")
    ).toBeTruthy()
  })

  it("renders a human auto-switch recovery explanation across app shell routes", async () => {
    const router = await renderPath({
      bootstrap: withRecoveryState("auto_switched"),
      path: "/app/settings/account",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/settings/account")
    })

    expect(
      screen.getByText(
        "We moved you into Operations Control because your previous workspace was no longer available."
      )
    ).toBeTruthy()
    expect(
      screen.queryByText("Current recovery state: auto_switched")
    ).toBeNull()
    await expect(
      screen.findByRole("heading", {
        name: "Account settings",
      })
    ).resolves.toBeTruthy()
  })

  it("keeps workspace admin navigation on account settings when the snapshot succeeds", async () => {
    getSettingsSnapshotMock.mockResolvedValue(activeSettingsSnapshot)

    const router = await renderPath({
      bootstrap: withActiveWorkspaceRole("owner"),
      path: "/app/settings/account",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/settings/account")
    })

    expect(getAccountProfileMock).toHaveBeenCalledWith()
    expect(getWorkspaceBootstrapMock).toHaveBeenCalledOnce()
    expect(getSettingsSnapshotMock).toHaveBeenCalledOnce()
    expect(getSettingsSnapshotMock).toHaveBeenCalledWith({
      workspaceId: "workspace_123",
    })
    await expect(
      screen.findByRole("heading", {
        name: "Account settings",
      })
    ).resolves.toBeTruthy()
    expectAdminSettingsNavigation()
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

    expect(getWorkspaceBootstrapMock).toHaveBeenCalledOnce()
    expect(getSettingsSnapshotMock).toHaveBeenCalledOnce()
    expect(getSettingsSnapshotMock).toHaveBeenCalledWith({
      workspaceId: "workspace_123",
    })
    await expect(
      screen.findByRole("heading", {
        name: "Settings",
      })
    ).resolves.toBeTruthy()
    expect({
      availableNowCount: screen.getAllByText("Available now").length,
      comingSoonCount: screen.getAllByText("Coming soon").length,
      hasWorkspaceLink:
        screen.getByRole("link", { name: "Workspace" }) !== null,
    }).toStrictEqual({
      availableNowCount: 2,
      comingSoonCount: 2,
      hasWorkspaceLink: true,
    })
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

      expect(getWorkspaceBootstrapMock).toHaveBeenCalledOnce()
      expect(getSettingsSnapshotMock).toHaveBeenCalledOnce()
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

    expect(getWorkspaceBootstrapMock).toHaveBeenCalledOnce()
    expect(getSettingsSnapshotMock).toHaveBeenCalledOnce()
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

  it("keeps account settings reachable for owners even when the admin snapshot fails", async () => {
    getSettingsSnapshotMock.mockRejectedValue(
      new Error("Workspace settings are temporarily unavailable.")
    )

    const router = await renderPath({
      bootstrap: withActiveWorkspaceRole("owner"),
      path: "/app/settings/account",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/settings/account")
    })

    expect(getAccountProfileMock).toHaveBeenCalledWith()
    expect(getWorkspaceBootstrapMock).toHaveBeenCalledOnce()
    expect(getSettingsSnapshotMock).toHaveBeenCalledOnce()
    expect(getSettingsSnapshotMock).toHaveBeenCalledWith({
      workspaceId: "workspace_123",
    })
    await expect(
      screen.findByRole("heading", {
        name: "Account settings",
      })
    ).resolves.toBeTruthy()
    expectAccountSettingsPage()
  })

  it("surfaces malformed admin snapshot errors on account settings", async () => {
    getSettingsSnapshotMock.mockRejectedValue(
      new TypeError("Malformed settings snapshot JSON.")
    )
    getAccountProfileMock.mockResolvedValue(
      activeSettingsSnapshot.accountProfile
    )

    await renderPath({
      bootstrap: withActiveWorkspaceRole("owner"),
      path: "/app/settings/account",
    })

    await expect(
      screen.findByText("Malformed settings snapshot JSON.")
    ).resolves.toBeTruthy()
  })

  it("keeps account settings reachable for members without loading the admin snapshot", async () => {
    const router = await renderPath({
      bootstrap: withActiveWorkspaceRole("dispatcher"),
      path: "/app/settings/account",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/settings/account")
    })

    expect(getAccountProfileMock).toHaveBeenCalledWith()
    expect(getSettingsSnapshotMock).not.toHaveBeenCalled()
    await expect(
      screen.findByRole("heading", {
        name: "Account settings",
      })
    ).resolves.toBeTruthy()
    expectAccountSettingsPage()
  })

  it.each(["owner", "admin"] as const)(
    "shows the editable workspace settings page for %s viewers",
    async (role) => {
      getSettingsSnapshotMock.mockResolvedValue(activeSettingsSnapshot)

      const router = await renderPath({
        bootstrap: withActiveWorkspaceRole(role),
        path: "/app/settings/workspace",
      })

      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/app/settings/workspace")
      })

      expect(getWorkspaceBootstrapMock).toHaveBeenCalledOnce()
      expect(getSettingsSnapshotMock).toHaveBeenCalledOnce()
      expect(getSettingsSnapshotMock).toHaveBeenCalledWith({
        workspaceId: "workspace_123",
      })
      await expect(
        screen.findByRole("heading", {
          name: "Workspace settings",
        })
      ).resolves.toBeTruthy()
      expectWorkspaceSettingsPage()
    }
  )

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
        name: "Your previous active workspace is no longer available",
      })
    ).resolves.toBeTruthy()
    expect(screen.queryByLabelText("Workspace name")).toBeNull()
    const onboardingText = String(document.body.textContent)
    expect(
      [
        "Choose where to continue.",
        "Operations Control",
        "Pending invites",
      ].every((text) => onboardingText.includes(text))
    ).toBeTruthy()
    expect(screen.queryByText("Workspace selection is coming next")).toBeNull()
  })
})
