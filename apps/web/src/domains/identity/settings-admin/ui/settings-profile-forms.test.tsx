import type {
  SettingsAdminAccountProfile,
  SettingsAdminSnapshot,
  SettingsAdminWorkspaceProfile,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { invalidateMock, updateAccountProfileMock, updateWorkspaceProfileMock } =
  vi.hoisted(() => ({
    invalidateMock: vi.fn(),
    updateAccountProfileMock: vi.fn(),
    updateWorkspaceProfileMock: vi.fn(),
  }))

const accountProfile: SettingsAdminAccountProfile = {
  email: "owner@example.com",
  id: "user_123",
  image: "https://cdn.example.com/avatar-old.png",
  name: "Owner User",
}

const workspaceProfile: SettingsAdminWorkspaceProfile = {
  id: "workspace_123",
  logo: "https://cdn.example.com/logo-old.png",
  name: "Operations Control",
  slug: "operations-control",
}

class MockImage {
  onerror: ((event: Event) => unknown) | null = null
  onload: ((event: Event) => unknown) | null = null
  private currentSrc = ""

  crossOrigin: string | null = null
  referrerPolicy = ""

  set src(value: string) {
    this.currentSrc = value
    queueMicrotask(() => {
      this.onload?.(new Event("load"))
    })
  }

  get src() {
    return this.currentSrc
  }
}

const snapshot: SettingsAdminSnapshot = {
  accountProfile,
  members: [],
  pendingInvites: [],
  permissions: {
    canEditWorkspaceProfile: true,
    canInviteRoles: ["owner", "admin", "dispatcher", "field_worker"],
    canManageInvites: true,
    canManageMembers: true,
  },
  viewerRole: "owner",
  workspaceProfile,
}

const bootstrap: WorkspaceBootstrap = {
  activeWorkspace: {
    id: workspaceProfile.id,
    logo: workspaceProfile.logo,
    name: workspaceProfile.name,
    role: "owner",
    slug: workspaceProfile.slug,
  },
  memberships: [],
  pendingInvites: [],
  recoveryState: "active_valid",
}

const deferred = <T,>() => {
  let resolveDeferred!: (value: T | PromiseLike<T>) => void
  let rejectDeferred!: (reason?: unknown) => void
  // eslint-disable-next-line promise/avoid-new
  const promise = new Promise<T>((resolve, reject) => {
    resolveDeferred = resolve
    rejectDeferred = reject
  })

  return { promise, reject: rejectDeferred, resolve: resolveDeferred }
}

const installMocks = () => {
  vi.doMock(import("@tanstack/react-router"), (() => ({
    useRouter: () => ({
      invalidate: invalidateMock,
    }),
  })) as never)

  vi.doMock(
    import("@/domains/identity/settings-admin/infra/update-account-profile"),
    (() => ({
      updateAccountProfile: updateAccountProfileMock,
    })) as never
  )

  vi.doMock(
    import("@/domains/identity/settings-admin/infra/update-workspace-profile"),
    (() => ({
      updateWorkspaceProfile: updateWorkspaceProfileMock,
    })) as never
  )
}

const loadUi = async () => {
  installMocks()

  const [
    { WorkspaceBootstrapProvider },
    { AccountSettingsPage },
    { WorkspaceSettingsPage },
  ] = await Promise.all([
    import("@/domains/workspaces/bootstrap/ui/workspace-bootstrap-provider"),
    import("./account-settings-page"),
    import("./workspace-settings-page"),
  ])

  return {
    AccountSettingsPage,
    WorkspaceBootstrapProvider,
    WorkspaceSettingsPage,
  }
}

const resetMocks = () => {
  invalidateMock.mockReset()
  updateAccountProfileMock.mockReset()
  updateWorkspaceProfileMock.mockReset()
  vi.unstubAllGlobals()
  vi.stubGlobal("Image", MockImage)
  vi.resetModules()
}

describe("account settings profile form", () => {
  it("shows the current account identity and avatar image from the snapshot", async () => {
    resetMocks()
    const { AccountSettingsPage, WorkspaceBootstrapProvider } = await loadUi()

    const view = render(
      <WorkspaceBootstrapProvider bootstrap={bootstrap}>
        <AccountSettingsPage accountProfile={accountProfile} />
      </WorkspaceBootstrapProvider>
    )

    try {
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
        "Owner User"
      )
      expect(screen.getByText("Owner User")).toBeTruthy()
      expect(screen.getByText("Email context: owner@example.com.")).toBeTruthy()
      await waitFor(() => {
        expect(
          screen.getByRole("img", { name: "Owner User avatar" })
        ).toBeTruthy()
      })
      expect(
        (screen.getByLabelText("Avatar image URL") as HTMLInputElement).value
      ).toBe("https://cdn.example.com/avatar-old.png")
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("updates the account preview as the name and avatar URL change", async () => {
    resetMocks()
    const { AccountSettingsPage, WorkspaceBootstrapProvider } = await loadUi()

    const user = userEvent.setup()
    const view = render(
      <WorkspaceBootstrapProvider bootstrap={bootstrap}>
        <AccountSettingsPage accountProfile={accountProfile} />
      </WorkspaceBootstrapProvider>
    )

    try {
      await user.clear(screen.getByLabelText("Name"))
      await user.type(screen.getByLabelText("Name"), "Ada Lovelace")

      await waitFor(() => {
        expect(screen.getByText("Ada Lovelace")).toBeTruthy()
      })
      await waitFor(() => {
        expect(
          screen.getByRole("img", { name: "Ada Lovelace avatar" })
        ).toBeTruthy()
      })

      await user.clear(screen.getByLabelText("Avatar image URL"))

      await waitFor(() => {
        expect(screen.getByText("AL")).toBeTruthy()
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("submits the account profile and refreshes the route data on success", async () => {
    resetMocks()
    updateAccountProfileMock.mockResolvedValue({
      ...accountProfile,
      image: "https://cdn.example.com/avatar-new.png",
      name: "Ada Lovelace",
    })
    const { AccountSettingsPage, WorkspaceBootstrapProvider } = await loadUi()

    const user = userEvent.setup()
    const view = render(
      <WorkspaceBootstrapProvider bootstrap={bootstrap}>
        <AccountSettingsPage accountProfile={accountProfile} />
      </WorkspaceBootstrapProvider>
    )

    try {
      await user.clear(screen.getByLabelText("Name"))
      await user.type(screen.getByLabelText("Name"), "  Ada Lovelace  ")
      await user.clear(screen.getByLabelText("Avatar image URL"))
      await user.type(
        screen.getByLabelText("Avatar image URL"),
        "  https://cdn.example.com/avatar-new.png  "
      )
      await user.click(
        screen.getByRole("button", { name: "Save account profile" })
      )

      await waitFor(() => {
        expect(updateAccountProfileMock).toHaveBeenCalledWith({
          image: "https://cdn.example.com/avatar-new.png",
          name: "Ada Lovelace",
        })
      })

      await waitFor(() => {
        expect(invalidateMock).toHaveBeenCalledWith()
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("shows auth service errors when the account update fails", async () => {
    resetMocks()
    updateAccountProfileMock.mockRejectedValue(
      new Error("Your session expired. Please sign in again.")
    )
    const { AccountSettingsPage, WorkspaceBootstrapProvider } = await loadUi()

    const user = userEvent.setup()
    const view = render(
      <WorkspaceBootstrapProvider bootstrap={bootstrap}>
        <AccountSettingsPage accountProfile={accountProfile} />
      </WorkspaceBootstrapProvider>
    )

    try {
      await user.clear(screen.getByLabelText("Name"))
      await user.type(screen.getByLabelText("Name"), "Ada Lovelace")
      await user.click(
        screen.getByRole("button", { name: "Save account profile" })
      )

      await waitFor(() => {
        expect(
          screen.getByText("Your session expired. Please sign in again.")
        ).toBeTruthy()
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("shows a validation message when the account name is blank", async () => {
    resetMocks()
    const { AccountSettingsPage, WorkspaceBootstrapProvider } = await loadUi()

    const user = userEvent.setup()
    const view = render(
      <WorkspaceBootstrapProvider bootstrap={bootstrap}>
        <AccountSettingsPage accountProfile={accountProfile} />
      </WorkspaceBootstrapProvider>
    )

    try {
      await user.clear(screen.getByLabelText("Name"))
      await user.click(
        screen.getByRole("button", { name: "Save account profile" })
      )

      await waitFor(() => {
        expect(screen.getByText("Name is required.")).toBeTruthy()
      })
      expect(updateAccountProfileMock).not.toHaveBeenCalled()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("disables the account form while the profile save is in flight", async () => {
    resetMocks()
    const pending = deferred<{
      email: string
      id: string
      image: string | null
      name: string
    }>()
    updateAccountProfileMock.mockReturnValue(pending.promise)
    const { AccountSettingsPage, WorkspaceBootstrapProvider } = await loadUi()

    const user = userEvent.setup()
    const view = render(
      <WorkspaceBootstrapProvider bootstrap={bootstrap}>
        <AccountSettingsPage accountProfile={accountProfile} />
      </WorkspaceBootstrapProvider>
    )

    try {
      await user.type(screen.getByLabelText("Name"), "Ada Lovelace")
      await user.click(
        screen.getByRole("button", { name: "Save account profile" })
      )

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Saving account profile..." })
        ).toBeTruthy()
      })

      expect(
        (screen.getByLabelText("Name") as HTMLInputElement).disabled
      ).toBeTruthy()
      expect(
        (screen.getByLabelText("Avatar image URL") as HTMLInputElement).disabled
      ).toBeTruthy()
      expect(
        (
          screen.getByRole("button", {
            name: "Saving account profile...",
          }) as HTMLButtonElement
        ).disabled
      ).toBeTruthy()
    } finally {
      pending.resolve({
        ...accountProfile,
        image: accountProfile.image,
        name: accountProfile.name,
      })
      view.unmount()
      cleanup()
    }
  })
})

describe("workspace settings profile form", () => {
  it("shows the current workspace identity and logo image from the snapshot", async () => {
    resetMocks()
    const { WorkspaceBootstrapProvider, WorkspaceSettingsPage } = await loadUi()

    const view = render(
      <WorkspaceBootstrapProvider bootstrap={bootstrap}>
        <WorkspaceSettingsPage snapshot={snapshot} />
      </WorkspaceBootstrapProvider>
    )

    try {
      expect(
        (screen.getByLabelText("Workspace name") as HTMLInputElement).value
      ).toBe("Operations Control")
      expect(screen.getByText("Operations Control")).toBeTruthy()
      expect(
        screen.getByText("Workspace context: operations-control.")
      ).toBeTruthy()
      await waitFor(() => {
        expect(
          screen.getByRole("img", { name: "Operations Control logo" })
        ).toBeTruthy()
      })
      expect(
        (screen.getByLabelText("Logo URL") as HTMLInputElement).value
      ).toBe("https://cdn.example.com/logo-old.png")
      expect(
        (screen.getByLabelText("Workspace slug") as HTMLInputElement).value
      ).toBe("operations-control")
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("updates the workspace preview as the name and logo URL change", async () => {
    resetMocks()
    const { WorkspaceBootstrapProvider, WorkspaceSettingsPage } = await loadUi()

    const user = userEvent.setup()
    const view = render(
      <WorkspaceBootstrapProvider bootstrap={bootstrap}>
        <WorkspaceSettingsPage snapshot={snapshot} />
      </WorkspaceBootstrapProvider>
    )

    try {
      await user.clear(screen.getByLabelText("Workspace name"))
      await user.type(screen.getByLabelText("Workspace name"), "Field Ops")

      await waitFor(() => {
        expect(screen.getByText("Field Ops")).toBeTruthy()
      })
      await waitFor(() => {
        expect(screen.getByRole("img", { name: "Field Ops logo" })).toBeTruthy()
      })

      await user.clear(screen.getByLabelText("Logo URL"))

      await waitFor(() => {
        expect(screen.getByText("FO")).toBeTruthy()
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("submits the workspace profile and refreshes the route data on success", async () => {
    resetMocks()
    updateWorkspaceProfileMock.mockResolvedValue({
      ...workspaceProfile,
      logo: "https://cdn.example.com/logo-new.png",
      name: "Field Operations",
    })
    const { WorkspaceBootstrapProvider, WorkspaceSettingsPage } = await loadUi()

    const user = userEvent.setup()
    const view = render(
      <WorkspaceBootstrapProvider bootstrap={bootstrap}>
        <WorkspaceSettingsPage snapshot={snapshot} />
      </WorkspaceBootstrapProvider>
    )

    try {
      await user.clear(screen.getByLabelText("Workspace name"))
      await user.type(
        screen.getByLabelText("Workspace name"),
        "Field Operations"
      )
      await user.clear(screen.getByLabelText("Logo URL"))
      await user.type(
        screen.getByLabelText("Logo URL"),
        "  https://cdn.example.com/logo-new.png  "
      )
      await user.click(
        screen.getByRole("button", { name: "Save workspace profile" })
      )

      await waitFor(() => {
        expect(updateWorkspaceProfileMock).toHaveBeenCalledWith({
          logo: "https://cdn.example.com/logo-new.png",
          name: "Field Operations",
          workspaceId: "workspace_123",
        })
      })

      await waitFor(() => {
        expect(invalidateMock).toHaveBeenCalledWith()
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("shows auth service errors when the workspace update fails", async () => {
    resetMocks()
    updateWorkspaceProfileMock.mockRejectedValue(
      new Error("Workspace profile access was revoked.")
    )
    const { WorkspaceBootstrapProvider, WorkspaceSettingsPage } = await loadUi()

    const user = userEvent.setup()
    const view = render(
      <WorkspaceBootstrapProvider bootstrap={bootstrap}>
        <WorkspaceSettingsPage snapshot={snapshot} />
      </WorkspaceBootstrapProvider>
    )

    try {
      await user.clear(screen.getByLabelText("Workspace name"))
      await user.type(screen.getByLabelText("Workspace name"), "Field Ops")
      await user.click(
        screen.getByRole("button", { name: "Save workspace profile" })
      )

      await waitFor(() => {
        expect(
          screen.getByText("Workspace profile access was revoked.")
        ).toBeTruthy()
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("shows a validation message when the workspace name is blank", async () => {
    resetMocks()
    const { WorkspaceBootstrapProvider, WorkspaceSettingsPage } = await loadUi()

    const user = userEvent.setup()
    const view = render(
      <WorkspaceBootstrapProvider bootstrap={bootstrap}>
        <WorkspaceSettingsPage snapshot={snapshot} />
      </WorkspaceBootstrapProvider>
    )

    try {
      await user.clear(screen.getByLabelText("Workspace name"))
      await user.click(
        screen.getByRole("button", { name: "Save workspace profile" })
      )

      await waitFor(() => {
        expect(screen.getByText("Workspace name is required.")).toBeTruthy()
      })
      expect(updateWorkspaceProfileMock).not.toHaveBeenCalled()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("disables the workspace form while the profile save is in flight", async () => {
    resetMocks()
    const pending = deferred<{
      id: string
      logo: string | null
      name: string
      slug: string
    }>()
    updateWorkspaceProfileMock.mockReturnValue(pending.promise)
    const { WorkspaceBootstrapProvider, WorkspaceSettingsPage } = await loadUi()

    const user = userEvent.setup()
    const view = render(
      <WorkspaceBootstrapProvider bootstrap={bootstrap}>
        <WorkspaceSettingsPage snapshot={snapshot} />
      </WorkspaceBootstrapProvider>
    )

    try {
      await user.type(screen.getByLabelText("Workspace name"), "Field Ops")
      await user.click(
        screen.getByRole("button", { name: "Save workspace profile" })
      )

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Saving workspace profile..." })
        ).toBeTruthy()
      })

      expect(
        (screen.getByLabelText("Workspace name") as HTMLInputElement).disabled
      ).toBeTruthy()
      expect(
        (screen.getByLabelText("Logo URL") as HTMLInputElement).disabled
      ).toBeTruthy()
      expect(
        (
          screen.getByRole("button", {
            name: "Saving workspace profile...",
          }) as HTMLButtonElement
        ).disabled
      ).toBeTruthy()
    } finally {
      pending.resolve({
        ...workspaceProfile,
        logo: workspaceProfile.logo,
        name: workspaceProfile.name,
      })
      view.unmount()
      cleanup()
    }
  })
})
