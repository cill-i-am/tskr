import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps, ReactNode } from "react"
import { renderToString } from "react-dom/server"

const {
  acceptWorkspaceInviteMock,
  clearWorkspaceInviteFlowMock,
  navigateMock,
  persistWorkspaceInviteFlowMock,
  readPendingWorkspaceInviteFlowMock,
  useSearchMock,
  useSessionMock,
} = vi.hoisted(() => ({
  acceptWorkspaceInviteMock: vi.fn(),
  clearWorkspaceInviteFlowMock: vi.fn(),
  navigateMock: vi.fn(),
  persistWorkspaceInviteFlowMock: vi.fn(),
  readPendingWorkspaceInviteFlowMock: vi.fn(),
  useSearchMock: vi.fn(),
  useSessionMock: vi.fn(),
}))

const acceptedBootstrap: WorkspaceBootstrap = {
  activeWorkspace: {
    id: "workspace_123",
    logo: null,
    name: "Operations Control",
    role: "dispatcher",
    slug: "operations-control",
  },
  memberships: [
    {
      id: "workspace_123",
      logo: null,
      name: "Operations Control",
      role: "dispatcher",
      slug: "operations-control",
    },
  ],
  pendingInvites: [],
  recoveryState: "active_valid",
}

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
    createFileRoute: () => (options: object) => options,
    useNavigate: () => navigateMock,
    useSearch: () => useSearchMock(),
  })) as never)

  vi.doMock(
    import("@/domains/workspaces/join-workspace/infra/accept-workspace-invite"),
    (() => ({
      acceptWorkspaceInvite: acceptWorkspaceInviteMock,
    })) as never
  )

  vi.doMock(
    import("@/domains/workspaces/join-workspace/ui/workspace-invite-flow"),
    (() => ({
      buildJoinWorkspaceTargetPath: () => "/join-workspace",
      clearWorkspaceInviteFlow: clearWorkspaceInviteFlowMock,
      persistWorkspaceInviteFlow: persistWorkspaceInviteFlowMock,
      readPendingWorkspaceInviteFlow: readPendingWorkspaceInviteFlowMock,
    })) as never
  )

  vi.doMock(
    import("@/domains/identity/authentication/ui/auth-client"),
    (() => ({
      authClient: {
        useSession: useSessionMock,
      },
    })) as never
  )
}

const loadModules = async () => {
  installMocks()

  const joinWorkspacePageModule = await import("./join-workspace-page")
  const joinWorkspaceRouteModule = await import("@/routes/join-workspace")

  return {
    JoinWorkspacePage: joinWorkspacePageModule.JoinWorkspacePage,
    JoinWorkspaceRoute: joinWorkspaceRouteModule.JoinWorkspaceRoute,
    Route: joinWorkspaceRouteModule.Route,
    validateJoinWorkspaceSearch:
      joinWorkspaceRouteModule.validateJoinWorkspaceSearch,
  }
}

const resetMocks = () => {
  acceptWorkspaceInviteMock.mockReset()
  clearWorkspaceInviteFlowMock.mockReset()
  navigateMock.mockReset()
  persistWorkspaceInviteFlowMock.mockReset()
  readPendingWorkspaceInviteFlowMock.mockReset()
  useSearchMock.mockReset()
  useSessionMock.mockReset()
  useSearchMock.mockReturnValue({})
  readPendingWorkspaceInviteFlowMock.mockReturnValue(null)
  useSessionMock.mockReturnValue({
    data: {
      session: {
        id: "session_123",
      },
    },
    isPending: false,
  })
  vi.resetModules()
}

describe("join workspace page", () => {
  it("renders the manual invite-code entry path when no token is present", async () => {
    resetMocks()
    const { JoinWorkspacePage } = await loadModules()

    const view = render(<JoinWorkspacePage />)

    try {
      expect(
        screen.getByRole("heading", {
          name: "Join a workspace with an invite code",
        })
      ).toBeTruthy()
      expect(screen.getByLabelText("Invite code")).toBeTruthy()
      expect(
        screen.getByRole("button", { name: "Join workspace" })
      ).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("keeps a stored invite durable through mount and clears it after successful acceptance", async () => {
    resetMocks()
    readPendingWorkspaceInviteFlowMock.mockReturnValue({
      code: "ABCD1234",
    })
    const { JoinWorkspacePage } = await loadModules()
    const user = userEvent.setup()

    const view = render(<JoinWorkspacePage />)

    try {
      await waitFor(() => {
        expect(screen.getByDisplayValue("ABCD1234")).toBeTruthy()
      })
      expect(clearWorkspaceInviteFlowMock).not.toHaveBeenCalled()

      acceptWorkspaceInviteMock.mockResolvedValue(acceptedBootstrap)

      await user.click(screen.getByRole("button", { name: "Join workspace" }))

      await waitFor(() => {
        expect(acceptWorkspaceInviteMock).toHaveBeenCalledWith({
          code: "ABCD1234",
        })
      })
      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          to: "/app",
        })
      })
      expect(clearWorkspaceInviteFlowMock).toHaveBeenCalledOnce()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("keeps a resumed invite available after a refresh before acceptance", async () => {
    resetMocks()
    readPendingWorkspaceInviteFlowMock.mockReturnValue({
      code: "ABCD1234",
    })
    const { JoinWorkspacePage } = await loadModules()

    const firstView = render(<JoinWorkspacePage />)

    try {
      await waitFor(() => {
        expect(screen.getByDisplayValue("ABCD1234")).toBeTruthy()
      })
    } finally {
      firstView.unmount()
      cleanup()
    }

    expect(clearWorkspaceInviteFlowMock).not.toHaveBeenCalled()

    const secondView = render(<JoinWorkspacePage />)

    try {
      await waitFor(() => {
        expect(screen.getByDisplayValue("ABCD1234")).toBeTruthy()
      })
      expect(readPendingWorkspaceInviteFlowMock).toHaveBeenCalledTimes(2)
      expect(clearWorkspaceInviteFlowMock).not.toHaveBeenCalled()
    } finally {
      secondView.unmount()
      cleanup()
    }
  })

  it("re-persists the invite flow when acceptance fails for the wrong account", async () => {
    resetMocks()
    readPendingWorkspaceInviteFlowMock.mockReturnValue({
      code: "ABCD1234",
    })
    acceptWorkspaceInviteMock.mockRejectedValue(
      new Error(
        "You are not the recipient of that invite. Sign in with the invited account to continue."
      )
    )
    const { JoinWorkspacePage } = await loadModules()
    const user = userEvent.setup()

    const view = render(<JoinWorkspacePage />)

    try {
      await waitFor(() => {
        expect(screen.getByDisplayValue("ABCD1234")).toBeTruthy()
      })

      await user.click(screen.getByRole("button", { name: "Join workspace" }))

      await waitFor(() => {
        expect(
          screen.getByRole("heading", {
            name: "This invite belongs to a different account",
          })
        ).toBeTruthy()
      })
      expect(persistWorkspaceInviteFlowMock).toHaveBeenCalledWith({
        code: "ABCD1234",
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("does not read invite flow during server render and resumes it after mount", async () => {
    resetMocks()
    readPendingWorkspaceInviteFlowMock.mockReturnValue({
      code: "ABCD1234",
    })
    const { JoinWorkspacePage } = await loadModules()

    renderToString(<JoinWorkspacePage />)

    expect(readPendingWorkspaceInviteFlowMock).not.toHaveBeenCalled()
    expect(clearWorkspaceInviteFlowMock).not.toHaveBeenCalled()

    const view = render(<JoinWorkspacePage />)

    try {
      await waitFor(() => {
        expect(screen.getByDisplayValue("ABCD1234")).toBeTruthy()
      })
      expect(readPendingWorkspaceInviteFlowMock).toHaveBeenCalledOnce()
      expect(clearWorkspaceInviteFlowMock).not.toHaveBeenCalled()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("bootstraps the signed-link flow from route search params and sends signed-out users to login", async () => {
    resetMocks()
    useSessionMock.mockReturnValue({
      data: null,
      isPending: false,
    })
    useSearchMock.mockReturnValue({
      token: "signed-token-123",
    })
    const { JoinWorkspaceRoute } = await loadModules()
    const user = userEvent.setup()

    const view = render(<JoinWorkspaceRoute />)

    try {
      expect(screen.queryByLabelText("Invite code")).toBeNull()
      expect(
        screen.getByRole("heading", {
          name: "Accept your workspace invite",
        })
      ).toBeTruthy()

      await user.click(screen.getByRole("button", { name: "Join workspace" }))

      expect(acceptWorkspaceInviteMock).not.toHaveBeenCalled()
      expect(persistWorkspaceInviteFlowMock).toHaveBeenCalledWith({
        token: "signed-token-123",
      })
      expect(navigateMock).toHaveBeenCalledWith({
        to: "/login",
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("accepts a signed invite token for authenticated users and navigates into the app", async () => {
    resetMocks()
    acceptWorkspaceInviteMock.mockResolvedValue(acceptedBootstrap)
    const { JoinWorkspacePage } = await loadModules()
    const user = userEvent.setup()

    const view = render(<JoinWorkspacePage token="signed-token-123" />)

    try {
      await user.click(screen.getByRole("button", { name: "Join workspace" }))

      await waitFor(() => {
        expect(acceptWorkspaceInviteMock).toHaveBeenCalledWith({
          token: "signed-token-123",
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

  it("renders the invalid-link recovery state for malformed signed tokens", async () => {
    resetMocks()
    acceptWorkspaceInviteMock.mockRejectedValue(
      new Error("Invite code or token is required.")
    )
    const { JoinWorkspacePage } = await loadModules()
    const user = userEvent.setup()

    const view = render(<JoinWorkspacePage token="signed-token-123" />)

    try {
      await user.click(screen.getByRole("button", { name: "Join workspace" }))

      await waitFor(() => {
        expect(
          screen.getByRole("heading", {
            name: "This invite is no longer valid",
          })
        ).toBeTruthy()
      })
      expect(
        screen.getByText(
          "Ask the workspace admin for a fresh invite link or code."
        )
      ).toBeTruthy()
      expect(
        screen.queryByText("Unable to join this workspace right now.")
      ).toBeNull()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("renders the invalid-link state when a signed invite token is missing", async () => {
    resetMocks()
    const { JoinWorkspacePage } = await loadModules()

    const view = render(<JoinWorkspacePage token="" />)

    try {
      expect(screen.getByText("Invite link invalid")).toBeTruthy()
      expect(screen.queryByLabelText("Invite code")).toBeNull()
      expect(
        screen.queryByRole("button", { name: "Join workspace" })
      ).toBeNull()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("keeps stored invite flow intact when the token query is empty", async () => {
    resetMocks()
    readPendingWorkspaceInviteFlowMock.mockReturnValue({
      code: "ABCD1234",
    })
    const { JoinWorkspacePage } = await loadModules()

    const view = render(<JoinWorkspacePage token="   " />)

    try {
      expect(screen.getByText("Invite link invalid")).toBeTruthy()
      expect(screen.queryByLabelText("Invite code")).toBeNull()
      expect(readPendingWorkspaceInviteFlowMock).not.toHaveBeenCalled()
      expect(clearWorkspaceInviteFlowMock).not.toHaveBeenCalled()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("clears token invite recovery state before sending the user to manual entry", async () => {
    resetMocks()
    acceptWorkspaceInviteMock.mockRejectedValue(
      new Error(
        "You are not the recipient of that invite. Sign in with the invited account to continue."
      )
    )
    const { JoinWorkspacePage } = await loadModules()
    const user = userEvent.setup()

    const view = render(<JoinWorkspacePage token="signed-token-123" />)

    try {
      await user.click(screen.getByRole("button", { name: "Join workspace" }))

      await waitFor(() => {
        expect(
          screen.getByRole("heading", {
            name: "This invite belongs to a different account",
          })
        ).toBeTruthy()
      })

      await user.click(
        screen.getByRole("button", { name: "Enter another invite" })
      )

      expect(clearWorkspaceInviteFlowMock).toHaveBeenCalledOnce()
      expect(navigateMock).toHaveBeenCalledWith({
        search: {
          token: undefined,
        },
        to: "/join-workspace",
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("accepts a manual invite code for authenticated users and navigates into the app", async () => {
    resetMocks()
    acceptWorkspaceInviteMock.mockResolvedValue(acceptedBootstrap)
    const { JoinWorkspacePage } = await loadModules()
    const user = userEvent.setup()

    const view = render(<JoinWorkspacePage />)

    try {
      await user.type(screen.getByLabelText("Invite code"), "  ABCD1234  ")
      await user.click(screen.getByRole("button", { name: "Join workspace" }))

      await waitFor(() => {
        expect(acceptWorkspaceInviteMock).toHaveBeenCalledWith({
          code: "ABCD1234",
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

  it.each([
    [
      "Invite not found. Ask a workspace admin for a fresh invite.",
      "This invite is no longer valid",
      "Ask the workspace admin for a fresh invite link or code.",
    ],
    [
      "Invite has been revoked.",
      "This invite has been revoked",
      "Request a new invite from the workspace admin who sent it.",
    ],
    [
      "Invite has already been used.",
      "This invite has already been used",
      "If you still need access, ask the workspace admin to issue a new invite.",
    ],
    [
      "You are not the recipient of that invite. Sign in with the invited account to continue.",
      "This invite belongs to a different account",
      "Sign in with the email address that received the invite to continue.",
    ],
  ])(
    "renders a page-level recovery state for %s",
    async (message, title, description) => {
      resetMocks()
      acceptWorkspaceInviteMock.mockRejectedValue(new Error(message))
      const { JoinWorkspacePage } = await loadModules()
      const user = userEvent.setup()

      const view = render(<JoinWorkspacePage />)

      try {
        await user.type(screen.getByLabelText("Invite code"), "ABCD1234")
        await user.click(screen.getByRole("button", { name: "Join workspace" }))

        await waitFor(() => {
          expect(screen.getByRole("heading", { name: title })).toBeTruthy()
        })
        expect(screen.getByText(description)).toBeTruthy()
        expect(screen.queryByLabelText("Invite code")).toBeNull()
      } finally {
        view.unmount()
        cleanup()
      }
    }
  )

  it("validates route search params so token stays string-only and optional", async () => {
    resetMocks()
    const { validateJoinWorkspaceSearch } = await loadModules()

    expect(
      validateJoinWorkspaceSearch({ token: "signed-token-123" })
    ).toStrictEqual({
      token: "signed-token-123",
    })
    expect(validateJoinWorkspaceSearch({ token: 1234 })).toStrictEqual({
      token: undefined,
    })
    expect(validateJoinWorkspaceSearch({})).toStrictEqual({
      token: undefined,
    })
  })
})
