/* eslint-disable promise/avoid-new, promise/prefer-await-to-callbacks, react-perf/jsx-no-new-function-as-prop, jest/no-hooks, unicorn/consistent-function-scoping, unicorn/no-unreadable-array-destructuring */

import type * as ElectricClientModule from "@electric-sql/client"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import {
  WorkspacePeopleSyncProvider,
  useWorkspacePeopleSync,
} from "./workspace-people-sync"

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

const createDeferred = <T,>(): Deferred<T> => {
  let resolveDeferred!: (value: T) => void
  // eslint-disable-next-line promise/prefer-await-to-callbacks
  const promise = new Promise<T>((resolve) => {
    resolveDeferred = resolve
  })

  return {
    promise,
    resolve: resolveDeferred,
  }
}

const electricClientMock = vi.hoisted(() => {
  type MockRow = {
    id: string
  } & Record<string, unknown>
  type ShapeCallback<T extends MockRow> = (data: {
    rows: T[]
    value: Map<string, T>
  }) => void

  interface MockShapeInstance<T extends MockRow = MockRow> {
    currentRows: T[]
    emit: (rows: T[]) => void
    resolveRows: (rows: T[]) => void
    rows: Promise<T[]>
    stream: {
      options: {
        fetchClient?: typeof fetch
        url: string
      }
    }
    subscribe: (callback: ShapeCallback<T>) => () => void
    unsubscribeAll: () => void
  }

  const shapeInstances: MockShapeInstance[] = []

  const MockShapeStream = function MockShapeStream(
    this: unknown,
    options: {
      fetchClient?: typeof fetch
      url: string
    }
  ) {
    return {
      options,
      unsubscribeAll: vi.fn(),
    }
  }

  const MockShape = function MockShape<T extends MockRow>(
    this: unknown,
    stream: {
      options: {
        fetchClient?: typeof fetch
        url: string
      }
    }
  ) {
    const rows = createDeferred<T[]>()
    const subscribers = new Set<ShapeCallback<T>>()
    const shape: MockShapeInstance<T> = {
      currentRows: [],
      emit: (nextRows) => {
        shape.currentRows = nextRows

        const value = new Map(nextRows.map((row) => [row.id, row]))

        for (const callback of subscribers) {
          callback({
            rows: nextRows,
            value,
          })
        }
      },
      resolveRows: (nextRows) => {
        shape.currentRows = nextRows
        rows.resolve(nextRows)
        shape.emit(nextRows)
      },
      rows: rows.promise,
      stream,
      subscribe: (callback) => {
        subscribers.add(callback)

        return () => {
          subscribers.delete(callback)
        }
      },
      unsubscribeAll: () => {
        subscribers.clear()
      },
    }

    shapeInstances.push(shape as MockShapeInstance)

    return shape
  }

  return {
    MockShape,
    MockShapeStream,
    reset: () => {
      shapeInstances.length = 0
    },
    shapeInstances,
  }
})

vi.mock<typeof ElectricClientModule>(import("@electric-sql/client"), () => ({
  Shape: electricClientMock.MockShape as never,
  ShapeStream: electricClientMock.MockShapeStream as never,
}))

const WorkspacePeopleSyncProbe = () => {
  const sync = useWorkspacePeopleSync()

  const handleRefresh = () => {
    sync.refresh()
  }

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
      <div>
        <dt>members</dt>
        <dd data-testid="members">{sync.members?.[0]?.name ?? "none"}</dd>
      </div>
      <div>
        <dt>invites</dt>
        <dd data-testid="invites">{sync.invites?.[0]?.code ?? "none"}</dd>
      </div>
      <button onClick={handleRefresh} type="button">
        refresh
      </button>
    </dl>
  )
}

const createWorkspaceContext = (workspaceId: string) =>
  Response.json({
    resources: {
      workspace: `/api/sync/workspaces/${workspaceId}/shapes/workspace`,
      workspaceInvites: `/api/sync/workspaces/${workspaceId}/shapes/workspace-invites`,
      workspaceMembers: `/api/sync/workspaces/${workspaceId}/shapes/workspace-members`,
    },
    userId: "user-123",
    viewerRole: "owner",
    workspace: {
      id: workspaceId,
      logo: null,
      name: "Ops Control",
      slug: "ops-control",
    },
  })

const defaultMemberProfiles = [
  {
    email: "owner@example.com",
    id: "member-owner",
    image: null,
    name: "Owner User",
    userId: "user-123",
  },
]

const getShape = (resourceSuffix: string) =>
  electricClientMock.shapeInstances.find((shape) =>
    shape.stream.options.url.endsWith(resourceSuffix)
  )

const resolveShapeRows = <T extends { id: string }>(
  resourceSuffix: string,
  rows: T[]
) => {
  const shape = getShape(resourceSuffix)

  if (!shape) {
    throw new Error(`Missing mocked shape for ${resourceSuffix}`)
  }

  act(() => {
    ;(shape as { resolveRows: (value: T[]) => void }).resolveRows(rows)
  })
}

const emitShapeRows = <T extends { id: string }>(
  resourceSuffix: string,
  rows: T[]
) => {
  const shape = getShape(resourceSuffix)

  if (!shape) {
    throw new Error(`Missing mocked shape for ${resourceSuffix}`)
  }

  act(() => {
    ;(shape as { emit: (value: T[]) => void }).emit(rows)
  })
}

const installContextFetchMock = (
  responseByWorkspaceId: Record<string, Response | (() => Response)>
) =>
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = new URL(input.toString())
    const [, , , , workspaceId] = url.pathname.split("/")
    const responseFactory = responseByWorkspaceId[workspaceId]

    if (!responseFactory) {
      throw new Error(`Unexpected fetch: ${url.toString()}`)
    }

    return Promise.resolve(
      typeof responseFactory === "function"
        ? responseFactory()
        : responseFactory
    )
  })

const createDeferredContextFetchMock = () => {
  const requests = new Map<string, Deferred<Response>[]>()

  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = new URL(input.toString())
    const [, , , , workspaceId] = url.pathname.split("/")
    const deferred = createDeferred<Response>()
    const currentRequests = requests.get(workspaceId) ?? []

    currentRequests.push(deferred)
    requests.set(workspaceId, currentRequests)

    return deferred.promise
  })

  return {
    resolveNext(workspaceId: string, response: Response) {
      const currentRequests = requests.get(workspaceId)
      const deferred = currentRequests?.shift()

      if (!deferred) {
        throw new Error(`No pending request for workspace ${workspaceId}`)
      }

      deferred.resolve(response)
    },
  }
}

describe("workspace people sync provider", () => {
  afterEach(() => {
    delete document.documentElement.dataset.apiBaseUrl
    electricClientMock.reset()
    vi.restoreAllMocks()
  })

  it("hydrates a workspace-scoped sync context and exposes collections", async () => {
    document.documentElement.dataset.apiBaseUrl = "http://api.internal:3001"
    installContextFetchMock({
      "workspace-123": createWorkspaceContext("workspace-123"),
    })

    render(
      <WorkspacePeopleSyncProvider
        memberProfiles={defaultMemberProfiles}
        workspaceId="workspace-123"
      >
        <WorkspacePeopleSyncProbe />
      </WorkspacePeopleSyncProvider>
    )

    await waitFor(() => {
      expect(electricClientMock.shapeInstances).toHaveLength(2)
    })

    resolveShapeRows(
      "/api/sync/workspaces/workspace-123/shapes/workspace-members",
      []
    )
    resolveShapeRows(
      "/api/sync/workspaces/workspace-123/shapes/workspace-invites",
      []
    )

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("ready")
    })

    expect(screen.getByTestId("workspace").textContent).toBe("workspace-123")
    expect(screen.getByTestId("members-collection").textContent).toBe(
      "workspace-members:workspace-123"
    )
    expect(screen.getByTestId("mutation-client").textContent).toBe("function")
  })

  it("updates workspace members and invites from live Electric shape callbacks", async () => {
    document.documentElement.dataset.apiBaseUrl = "http://api.internal:3001"
    installContextFetchMock({
      "workspace-123": createWorkspaceContext("workspace-123"),
    })

    render(
      <WorkspacePeopleSyncProvider
        memberProfiles={defaultMemberProfiles}
        workspaceId="workspace-123"
      >
        <WorkspacePeopleSyncProbe />
      </WorkspacePeopleSyncProvider>
    )

    await waitFor(() => {
      expect(electricClientMock.shapeInstances).toHaveLength(2)
    })

    resolveShapeRows(
      "/api/sync/workspaces/workspace-123/shapes/workspace-members",
      [
        {
          id: "member-123",
          organization_id: "workspace-123",
          role: "owner",
          user_id: "user-123",
        },
      ]
    )
    resolveShapeRows(
      "/api/sync/workspaces/workspace-123/shapes/workspace-invites",
      [
        {
          code: "LIVE1234",
          email: "live-invite@example.com",
          id: "invite-123",
          organization_id: "workspace-123",
          role: "dispatcher",
          status: "pending",
        },
      ]
    )

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("ready")
    })

    expect(screen.getByTestId("members").textContent).toBe("Owner User")

    emitShapeRows(
      "/api/sync/workspaces/workspace-123/shapes/workspace-members",
      []
    )
    emitShapeRows(
      "/api/sync/workspaces/workspace-123/shapes/workspace-invites",
      []
    )

    await waitFor(() => {
      expect(screen.getByTestId("members").textContent).toBe("none")
    })

    expect(screen.getByTestId("invites").textContent).toBe("none")
  })

  it("stays loading until every initial Electric shape has resolved", async () => {
    document.documentElement.dataset.apiBaseUrl = "http://api.internal:3001"
    installContextFetchMock({
      "workspace-123": createWorkspaceContext("workspace-123"),
    })

    render(
      <WorkspacePeopleSyncProvider
        memberProfiles={defaultMemberProfiles}
        workspaceId="workspace-123"
      >
        <WorkspacePeopleSyncProbe />
      </WorkspacePeopleSyncProvider>
    )

    await waitFor(() => {
      expect(electricClientMock.shapeInstances).toHaveLength(2)
    })

    expect(screen.getByTestId("status").textContent).toBe("loading")
    expect(screen.getByTestId("members").textContent).toBe("none")
    expect(screen.getByTestId("invites").textContent).toBe("none")

    resolveShapeRows(
      "/api/sync/workspaces/workspace-123/shapes/workspace-members",
      [
        {
          id: "member-123",
          organization_id: "workspace-123",
          role: "owner",
          user_id: "user-123",
        },
      ]
    )
    resolveShapeRows(
      "/api/sync/workspaces/workspace-123/shapes/workspace-invites",
      []
    )

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("ready")
    })
    expect(screen.getByTestId("members").textContent).toBe("Owner User")
  })

  it("keeps a stale refresh from overwriting the next workspace after a switch", async () => {
    document.documentElement.dataset.apiBaseUrl = "http://api.internal:3001"
    const contextFetchMock = createDeferredContextFetchMock()

    const { rerender } = render(
      <WorkspacePeopleSyncProvider
        memberProfiles={defaultMemberProfiles}
        workspaceId="workspace-123"
      >
        <WorkspacePeopleSyncProbe />
      </WorkspacePeopleSyncProvider>
    )

    act(() => {
      contextFetchMock.resolveNext(
        "workspace-123",
        createWorkspaceContext("workspace-123")
      )
    })

    await waitFor(() => {
      expect(electricClientMock.shapeInstances).toHaveLength(2)
    })

    resolveShapeRows(
      "/api/sync/workspaces/workspace-123/shapes/workspace-members",
      []
    )
    resolveShapeRows(
      "/api/sync/workspaces/workspace-123/shapes/workspace-invites",
      []
    )

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("ready")
    })

    fireEvent.click(screen.getByRole("button", { name: "refresh" }))

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("loading")
    })

    rerender(
      <WorkspacePeopleSyncProvider
        memberProfiles={defaultMemberProfiles}
        workspaceId="workspace-456"
      >
        <WorkspacePeopleSyncProbe />
      </WorkspacePeopleSyncProvider>
    )

    act(() => {
      contextFetchMock.resolveNext(
        "workspace-456",
        createWorkspaceContext("workspace-456")
      )
    })

    await waitFor(() => {
      expect(electricClientMock.shapeInstances).toHaveLength(4)
    })

    resolveShapeRows(
      "/api/sync/workspaces/workspace-456/shapes/workspace-members",
      []
    )
    resolveShapeRows(
      "/api/sync/workspaces/workspace-456/shapes/workspace-invites",
      []
    )

    await waitFor(() => {
      expect(screen.getByTestId("workspace").textContent).toBe("workspace-456")
      expect(screen.getByTestId("status").textContent).toBe("ready")
    })

    act(() => {
      contextFetchMock.resolveNext(
        "workspace-123",
        createWorkspaceContext("workspace-123")
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId("workspace").textContent).toBe("workspace-456")
      expect(screen.getByTestId("status").textContent).toBe("ready")
    })
  })

  it("stays idle when no active workspace is available", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")

    render(
      <WorkspacePeopleSyncProvider
        memberProfiles={defaultMemberProfiles}
        workspaceId={null}
      >
        <WorkspacePeopleSyncProbe />
      </WorkspacePeopleSyncProvider>
    )

    expect(screen.getByTestId("status").textContent).toBe("idle")
    expect(screen.getByTestId("workspace").textContent).toBe("none")
    expect(screen.getByTestId("members-collection").textContent).toBe("none")

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
