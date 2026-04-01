import { render, screen, waitFor } from "@testing-library/react"

import {
  WorkspacePeopleSyncProvider,
  useWorkspacePeopleSync,
} from "./workspace-people-sync"

const WorkspacePeopleSyncProbe = () => {
  const sync = useWorkspacePeopleSync()

  return (
    <dl>
      <div>
        <dt>status</dt>
        <dd data-testid="status">{sync.status}</dd>
      </div>
      <div>
        <dt>workspace</dt>
        <dd data-testid="workspace">
          {sync.syncContext?.workspace.id ?? "none"}
        </dd>
      </div>
      <div>
        <dt>members collection</dt>
        <dd data-testid="members-collection">
          {sync.collections?.members.id ?? "none"}
        </dd>
      </div>
      <div>
        <dt>mutation client</dt>
        <dd data-testid="mutation-client">
          {typeof sync.mutations.createWorkspaceInvite}
        </dd>
      </div>
    </dl>
  )
}

describe("workspace people sync provider", () => {
  it("hydrates a workspace-scoped sync context and exposes collections", async () => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    document.documentElement.dataset.apiBaseUrl = "http://api.internal:3001"

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        resources: {
          workspace: "/api/sync/workspaces/workspace-123/shapes/workspace",
          workspaceInvites:
            "/api/sync/workspaces/workspace-123/shapes/workspace-invites",
          workspaceMemberUsers:
            "/api/sync/workspaces/workspace-123/shapes/workspace-member-users",
          workspaceMembers:
            "/api/sync/workspaces/workspace-123/shapes/workspace-members",
        },
        userId: "user-123",
        viewerRole: "owner",
        workspace: {
          id: "workspace-123",
          logo: null,
          name: "Ops Control",
          slug: "ops-control",
        },
      })
    )

    render(
      <WorkspacePeopleSyncProvider workspaceId="workspace-123">
        <WorkspacePeopleSyncProbe />
      </WorkspacePeopleSyncProvider>
    )

    expect(screen.getByTestId("status").textContent).toBe("loading")
    expect(screen.getByTestId("workspace").textContent).toBe("none")
    expect(screen.getByTestId("members-collection").textContent).toBe("none")

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("ready")
    })

    expect(screen.getByTestId("workspace").textContent).toBe("workspace-123")
    expect(screen.getByTestId("members-collection").textContent).toBe(
      "workspace-members:workspace-123"
    )
    delete document.documentElement.dataset.apiBaseUrl
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("stays idle when no active workspace is available", async () => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    const fetchMock = vi.spyOn(globalThis, "fetch")

    render(
      <WorkspacePeopleSyncProvider workspaceId={null}>
        <WorkspacePeopleSyncProbe />
      </WorkspacePeopleSyncProvider>
    )

    expect(screen.getByTestId("status").textContent).toBe("idle")
    expect(screen.getByTestId("workspace").textContent).toBe("none")
    expect(screen.getByTestId("members-collection").textContent).toBe("none")
    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled()
    })
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("moves into an error state when the sync context payload is malformed", async () => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    document.documentElement.dataset.apiBaseUrl = "http://api.internal:3001"

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        resources: {},
      })
    )

    render(
      <WorkspacePeopleSyncProvider workspaceId="workspace-123">
        <WorkspacePeopleSyncProbe />
      </WorkspacePeopleSyncProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("error")
    })

    expect(screen.getByTestId("workspace").textContent).toBe("none")
    expect(screen.getByTestId("members-collection").textContent).toBe("none")
    delete document.documentElement.dataset.apiBaseUrl
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })
})
