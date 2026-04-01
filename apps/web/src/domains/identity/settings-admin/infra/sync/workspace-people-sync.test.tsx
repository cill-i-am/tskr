import { render, screen, waitFor } from "@testing-library/react"

import {
  WorkspacePeopleSyncProvider,
  useWorkspacePeopleSync,
} from "./workspace-people-sync"

const createSnapshotResponse = () =>
  Response.json(
    [
      {
        headers: {
          control: "up-to-date",
        },
      },
    ],
    {
      headers: {
        "electric-handle": "handle-1",
        "electric-offset": "0_0",
        "electric-schema": "[]",
        "electric-up-to-date": "true",
      },
      status: 200,
    }
  )

const createLiveResponse = () =>
  Response.json(
    [
      {
        headers: {
          control: "up-to-date",
        },
      },
    ],
    {
      headers: {
        "electric-cursor": "cursor-1",
        "electric-handle": "handle-1",
        "electric-offset": "0_0",
        "electric-schema": "[]",
        "electric-up-to-date": "true",
      },
      status: 200,
    }
  )

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
        <dt>members collection preload</dt>
        <dd data-testid="members-collection-preload">
          {typeof sync.collections?.members.preload}
        </dd>
      </div>
      <div>
        <dt>members collection utils</dt>
        <dd data-testid="members-collection-utils">
          {typeof sync.collections?.members.utils.awaitTxId}
        </dd>
      </div>
      <div>
        <dt>member users collection</dt>
        <dd data-testid="member-users-collection">
          {sync.collections && "memberUsers" in sync.collections
            ? "present"
            : "none"}
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

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          resources: {
            workspace: "/api/sync/workspaces/workspace-123/shapes/workspace",
            workspaceInvites:
              "/api/sync/workspaces/workspace-123/shapes/workspace-invites",
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
      .mockResolvedValueOnce(createSnapshotResponse())
      .mockResolvedValueOnce(createSnapshotResponse())
      .mockResolvedValueOnce(createSnapshotResponse())
      .mockResolvedValueOnce(createLiveResponse())
      .mockResolvedValueOnce(createLiveResponse())
      .mockResolvedValueOnce(createLiveResponse())

    render(
      <WorkspacePeopleSyncProvider workspaceId="workspace-123">
        <WorkspacePeopleSyncProbe />
      </WorkspacePeopleSyncProvider>
    )

    expect([
      screen.getByTestId("status").textContent,
      screen.getByTestId("workspace").textContent,
      screen.getByTestId("members-collection").textContent,
    ]).toStrictEqual(["loading", "none", "none"])

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("ready")
    })

    expect([
      screen.getByTestId("workspace").textContent,
      screen.getByTestId("members-collection").textContent,
    ]).toStrictEqual(["workspace-123", "workspace-members:workspace-123"])
    expect([
      screen.getByTestId("members-collection-preload").textContent,
      screen.getByTestId("members-collection-utils").textContent,
      screen.getByTestId("member-users-collection").textContent,
    ]).toStrictEqual(["function", "function", "none"])
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://api.internal:3001/api/sync/workspaces/workspace-123/context",
      {
        credentials: "include",
        headers: undefined,
      }
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
