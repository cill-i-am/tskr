import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps, ReactNode } from "react"

const { createWorkspaceMock, navigateMock, updateActiveWorkspaceMock } =
  vi.hoisted(() => ({
    createWorkspaceMock: vi.fn(),
    navigateMock: vi.fn(),
    updateActiveWorkspaceMock: vi.fn(),
  }))

const installMocks = () => {
  vi.doMock(import("@tanstack/react-router"), (() => ({
    Link: ({
      children,
      to,
      ...props
    }: {
      children?: ReactNode
      to: string
    } & ComponentProps<"a">) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => navigateMock,
  })) as never)

  vi.doMock(
    import("@/domains/workspaces/onboarding/infra/create-workspace-client"),
    (() => ({
      createWorkspace: createWorkspaceMock,
    })) as never
  )

  vi.doMock(
    import("@/domains/workspaces/active-workspace/infra/update-active-workspace"),
    (() => ({
      updateActiveWorkspace: updateActiveWorkspaceMock,
    })) as never
  )
}

const baseBootstrap: WorkspaceBootstrap = {
  activeWorkspace: null,
  memberships: [],
  pendingInvites: [],
  recoveryState: "onboarding_required",
}

const renderPage = async (bootstrap: WorkspaceBootstrap) => {
  installMocks()
  const { WorkspaceBootstrapProvider } =
    await import("@/domains/workspaces/bootstrap/ui/workspace-bootstrap-provider")
  const { WorkspaceOnboardingPage } =
    await import("./workspace-onboarding-page")

  const view = render(
    <WorkspaceBootstrapProvider bootstrap={bootstrap}>
      <WorkspaceOnboardingPage />
    </WorkspaceBootstrapProvider>
  )

  return {
    view,
  }
}

const resetMocks = () => {
  createWorkspaceMock.mockReset()
  navigateMock.mockReset()
  updateActiveWorkspaceMock.mockReset()
  vi.resetModules()
}

describe("workspace onboarding page", () => {
  it("renders the create-workspace flow for onboarding-required users", async () => {
    resetMocks()
    const { view } = await renderPage(baseBootstrap)

    try {
      expect(
        screen.getByRole("heading", {
          name: "Create your first workspace",
        })
      ).toBeTruthy()
      expect(screen.getByLabelText("Workspace name")).toBeTruthy()
      expect(
        screen.getByRole("button", { name: "Create workspace" })
      ).toBeTruthy()
      expect(
        screen
          .getByRole("button", { name: "Join by invite" })
          .getAttribute("href")
      ).toBe("/join-workspace")
      expect(
        screen.queryByText(
          "Join by invite lands in TSK-27. For now, start by creating your own workspace."
        )
      ).toBeNull()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("renders the recovery fallback instead of the create form when selection is required", async () => {
    resetMocks()
    const { view } = await renderPage({
      ...baseBootstrap,
      activeWorkspace: null,
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
          email: "beta@acme.test",
          expiresAt: "2026-04-01T12:00:00.000Z",
          id: "invite_123",
          role: "dispatcher",
          status: "pending",
          workspaceId: "workspace_789",
          workspaceName: "North Harbor",
          workspaceSlug: "north-harbor",
        },
      ],
      recoveryState: "selection_required",
    })

    try {
      screen.getByRole("heading", {
        name: "Your previous active workspace is no longer available",
      })
      screen.getByText("Choose where to continue.")
      expect(screen.queryByLabelText("Workspace name")).toBeNull()
      expect(screen.queryByRole("link", { name: "Join by invite" })).toBeNull()
      screen.getByText("Operations Control")
      screen.getByText("Field Team")
      screen.getByText("Owner")
      screen.getByText("Admin")
      screen.getByText("operations-control")
      screen.getByText("field-team")
      screen.getByText("Pending invites")
      screen.getByText("North Harbor")
      screen.getByText("beta@acme.test")
      screen.getByText("Dispatcher")
      const user = userEvent.setup()
      const switchButton = screen.getByRole("button", {
        name: "Switch to Operations Control",
      })

      await user.click(switchButton)
      await waitFor(() => {
        expect(
          screen.getByRole("button", {
            name: "Switching to Operations Control...",
          })
        ).toBeTruthy()
      })
      expect((switchButton as HTMLButtonElement).disabled).toBeTruthy()

      await user.click(switchButton)
      expect(updateActiveWorkspaceMock).toHaveBeenCalledTimes(1)
      await waitFor(() => {
        expect(updateActiveWorkspaceMock).toHaveBeenCalledWith({
          workspaceId: "workspace_123",
        })
      })
      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          to: "/app",
        })
      })
      expect(
        screen.queryByText("Workspace selection is coming next")
      ).toBeNull()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("requires a workspace name before submitting", async () => {
    resetMocks()
    const { view } = await renderPage(baseBootstrap)
    const user = userEvent.setup()

    try {
      await user.click(screen.getByRole("button", { name: "Create workspace" }))

      expect(createWorkspaceMock).not.toHaveBeenCalled()
      expect(screen.getByText("Workspace name is required.")).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("submits only the trimmed workspace name and navigates into the app on success", async () => {
    resetMocks()
    createWorkspaceMock.mockResolvedValue({
      ...baseBootstrap,
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
      recoveryState: "active_valid",
    } satisfies WorkspaceBootstrap)
    const { view } = await renderPage(baseBootstrap)
    const user = userEvent.setup()

    try {
      await user.type(
        screen.getByLabelText("Workspace name"),
        "  Operations Control  "
      )
      await user.click(screen.getByRole("button", { name: "Create workspace" }))

      await waitFor(() => {
        expect(createWorkspaceMock).toHaveBeenCalledWith({
          name: "Operations Control",
        })
      })
      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          to: "/app",
        })
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("shows inline submission errors from workspace creation", async () => {
    resetMocks()
    createWorkspaceMock.mockRejectedValue(
      new Error("Workspace creation is unavailable right now.")
    )
    const { view } = await renderPage(baseBootstrap)
    const user = userEvent.setup()

    try {
      await user.type(
        screen.getByLabelText("Workspace name"),
        "Operations Control"
      )
      await user.click(screen.getByRole("button", { name: "Create workspace" }))

      await waitFor(() => {
        expect(
          screen.getByText("Workspace creation is unavailable right now.")
        ).toBeTruthy()
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })
})
