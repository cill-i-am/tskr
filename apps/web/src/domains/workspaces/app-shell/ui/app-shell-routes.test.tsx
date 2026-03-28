import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { getWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client"
import { routeTree } from "@/routeTree.gen"
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"

vi.mock<typeof import('@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client')>(
  import('@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client'),
  () => ({
    getWorkspaceBootstrap: vi.fn(),
  })
)

const getWorkspaceBootstrapMock = vi.mocked(getWorkspaceBootstrap)

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

  it("renders the onboarding holding page from shared bootstrap state", async () => {
    const router = await renderPath({
      bootstrap: withRecoveryState("selection_required"),
      path: "/onboarding",
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding")
    })

    await expect(
      screen.findByRole("heading", {
        name: "Finish setting up your workspace access",
      })
    ).resolves.toBeTruthy()
    expect(screen.getByText("selection_required")).toBeTruthy()
  })
})
