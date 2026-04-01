import type { SettingsAdminWorkspaceRole } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import {
  fetchApiService,
  resolveApiBaseUrl,
} from "@/domains/shared/infra/api-service-client"
import { Shape, ShapeStream } from "@electric-sql/client"
import { Schema } from "effect"
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"

import { createWorkspacePeopleSyncMutationClient } from "./workspace-people-mutation-client"

interface WorkspacePeopleSyncContextResponse {
  resources: {
    workspace: string
    workspaceInvites: string
    workspaceMemberUsers: string
    workspaceMembers: string
  }
  userId: string
  viewerRole: string
  workspace: {
    id: string
    logo: string | null
    name: string
    slug: string
  }
}

interface WorkspacePeopleSyncCollections {
  invites: {
    id: string
    resource: string
  }
  memberUsers: {
    id: string
    resource: string
  }
  members: {
    id: string
    resource: string
  }
  workspace: {
    id: string
    resource: string
  }
}

interface WorkspacePeopleSyncInvite {
  code: string
  email: string
  id: string
  role: SettingsAdminWorkspaceRole
  status: string
  workspaceId: string
}

interface WorkspacePeopleSyncMember {
  email: string
  id: string
  image: string | null
  isCurrentUser: boolean
  name: string
  role: SettingsAdminWorkspaceRole
  userId: string
}

type WorkspacePeopleSyncStatus = "idle" | "loading" | "ready" | "error"

interface LoadedWorkspacePeopleSyncData {
  invites: WorkspacePeopleSyncInvite[]
  members: WorkspacePeopleSyncMember[]
  syncContext: WorkspacePeopleSyncContextResponse
}

interface WorkspacePeopleSyncValue {
  collections: WorkspacePeopleSyncCollections | null
  error: string | null
  invites: WorkspacePeopleSyncInvite[]
  members: WorkspacePeopleSyncMember[]
  mutations: ReturnType<typeof createWorkspacePeopleSyncMutationClient>
  refresh: () => Promise<LoadedWorkspacePeopleSyncData | null>
  status: WorkspacePeopleSyncStatus
  syncContext: WorkspacePeopleSyncContextResponse | null
}

interface WorkspacePeopleSyncProviderProps {
  children: React.ReactNode
  workspaceId: string | null
}

interface WorkspaceMemberRow {
  id: string
  organization_id: string
  role: SettingsAdminWorkspaceRole
  user_id: string
}

interface WorkspaceMemberUserRow {
  email: string
  id: string
  image: string | null
  name: string
}

interface WorkspaceInviteRow {
  code: string
  email: string
  id: string
  organization_id: string
  role: SettingsAdminWorkspaceRole
  status: string
}

interface WorkspacePeopleSyncController {
  dispose: () => void
  readCurrentData: () => LoadedWorkspacePeopleSyncData
}

const workspacePeopleSyncContextResponseSchema = Schema.Struct({
  resources: Schema.Struct({
    workspace: Schema.String,
    workspaceInvites: Schema.String,
    workspaceMemberUsers: Schema.String,
    workspaceMembers: Schema.String,
  }),
  userId: Schema.String,
  viewerRole: Schema.String,
  workspace: Schema.Struct({
    id: Schema.String,
    logo: Schema.NullOr(Schema.String),
    name: Schema.String,
    slug: Schema.String,
  }),
})

const WorkspacePeopleSyncContext =
  createContext<WorkspacePeopleSyncValue | null>(null)

const createWorkspacePeopleCollections = (
  syncContext: WorkspacePeopleSyncContextResponse
): WorkspacePeopleSyncCollections => ({
  invites: {
    id: `workspace-invites:${syncContext.workspace.id}`,
    resource: syncContext.resources.workspaceInvites,
  },
  memberUsers: {
    id: `workspace-member-users:${syncContext.workspace.id}`,
    resource: syncContext.resources.workspaceMemberUsers,
  },
  members: {
    id: `workspace-members:${syncContext.workspace.id}`,
    resource: syncContext.resources.workspaceMembers,
  },
  workspace: {
    id: `workspace:${syncContext.workspace.id}`,
    resource: syncContext.resources.workspace,
  },
})

const electricFetchClient: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    credentials: "include",
  })

const describeWorkspacePeopleSyncError = (
  nextError: unknown,
  fallback: string
) =>
  nextError instanceof Error && nextError.message.length > 0
    ? nextError.message
    : fallback

const buildWorkspaceMembers = ({
  memberRows,
  memberUsers,
  userId,
}: {
  memberRows: WorkspaceMemberRow[]
  memberUsers: WorkspaceMemberUserRow[]
  userId: string
}): WorkspacePeopleSyncMember[] => {
  const memberUsersById = new Map(
    memberUsers.map((memberUser) => [memberUser.id, memberUser])
  )

  return memberRows.flatMap((memberRow) => {
    const memberUser = memberUsersById.get(memberRow.user_id)

    if (!memberUser) {
      return []
    }

    return [
      {
        email: memberUser.email,
        id: memberRow.id,
        image: memberUser.image,
        isCurrentUser: memberUser.id === userId,
        name: memberUser.name,
        role: memberRow.role,
        userId: memberUser.id,
      },
    ]
  })
}

const buildWorkspaceInvites = (
  inviteRows: WorkspaceInviteRow[]
): WorkspacePeopleSyncInvite[] =>
  inviteRows.map((inviteRow) => ({
    code: inviteRow.code,
    email: inviteRow.email,
    id: inviteRow.id,
    role: inviteRow.role,
    status: inviteRow.status,
    workspaceId: inviteRow.organization_id,
  }))

const fetchWorkspacePeopleSyncContext = async (
  workspaceId: string
): Promise<WorkspacePeopleSyncContextResponse> => {
  const response = await fetchApiService(
    `/api/sync/workspaces/${workspaceId}/context`
  )

  if (!response.ok) {
    throw new Error(
      `Unable to load workspace people sync context (${response.status}).`
    )
  }

  return Schema.decodeUnknownSync(workspacePeopleSyncContextResponseSchema)(
    await response.json()
  )
}

const createWorkspaceShape = <A extends { id: string }>({
  onError,
  resource,
}: {
  onError: (nextError: unknown) => void
  resource: string
}) => {
  const abortController = new AbortController()
  const stream = new ShapeStream<A>({
    fetchClient: electricFetchClient,
    onError,
    signal: abortController.signal,
    url: new URL(resource, resolveApiBaseUrl()).toString(),
  })
  const shape = new Shape(stream)

  return {
    dispose: () => {
      abortController.abort()
      shape.unsubscribeAll()
    },
    shape,
  }
}

const createWorkspacePeopleSyncController = async ({
  onData,
  onError,
  syncContext,
}: {
  onData: (nextData: LoadedWorkspacePeopleSyncData) => void
  onError: (nextError: unknown) => void
  syncContext: WorkspacePeopleSyncContextResponse
}): Promise<WorkspacePeopleSyncController> => {
  const workspaceInvitesShape = createWorkspaceShape<WorkspaceInviteRow>({
    onError,
    resource: syncContext.resources.workspaceInvites,
  })
  const workspaceMemberUsersShape =
    createWorkspaceShape<WorkspaceMemberUserRow>({
      onError,
      resource: syncContext.resources.workspaceMemberUsers,
    })
  const workspaceMembersShape = createWorkspaceShape<WorkspaceMemberRow>({
    onError,
    resource: syncContext.resources.workspaceMembers,
  })

  const readCurrentData = (): LoadedWorkspacePeopleSyncData => ({
    invites: buildWorkspaceInvites(workspaceInvitesShape.shape.currentRows),
    members: buildWorkspaceMembers({
      memberRows: workspaceMembersShape.shape.currentRows,
      memberUsers: workspaceMemberUsersShape.shape.currentRows,
      userId: syncContext.userId,
    }),
    syncContext,
  })

  let hasLoadedInitialRows = false
  const publishCurrentData = () => {
    if (!hasLoadedInitialRows) {
      return
    }

    onData(readCurrentData())
  }

  const unsubscribers = [
    workspaceInvitesShape.shape.subscribe(publishCurrentData),
    workspaceMemberUsersShape.shape.subscribe(publishCurrentData),
    workspaceMembersShape.shape.subscribe(publishCurrentData),
  ]

  try {
    await Promise.all([
      workspaceInvitesShape.shape.rows,
      workspaceMemberUsersShape.shape.rows,
      workspaceMembersShape.shape.rows,
    ])
    hasLoadedInitialRows = true
  } catch (nextError) {
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
    workspaceInvitesShape.dispose()
    workspaceMemberUsersShape.dispose()
    workspaceMembersShape.dispose()
    throw nextError
  }

  return {
    dispose: () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
      workspaceInvitesShape.dispose()
      workspaceMemberUsersShape.dispose()
      workspaceMembersShape.dispose()
    },
    readCurrentData,
  }
}

const WorkspacePeopleSyncProvider = ({
  children,
  workspaceId,
}: WorkspacePeopleSyncProviderProps) => {
  const [syncContext, setSyncContext] =
    useState<WorkspacePeopleSyncContextResponse | null>(null)
  const [status, setStatus] = useState<WorkspacePeopleSyncStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<WorkspacePeopleSyncMember[]>([])
  const [invites, setInvites] = useState<WorkspacePeopleSyncInvite[]>([])
  const controllerRef = useRef<WorkspacePeopleSyncController | null>(null)
  const sessionRef = useRef<symbol | null>(null)

  const applyLoadedData = useEffectEvent(
    (nextData: LoadedWorkspacePeopleSyncData) => {
      setSyncContext(nextData.syncContext)
      setMembers(nextData.members)
      setInvites(nextData.invites)
      setStatus("ready")
      setError(null)
    }
  )

  const loadWorkspaceSync = useEffectEvent(
    async (
      nextWorkspaceId: string,
      preserveRows = false
    ): Promise<LoadedWorkspacePeopleSyncData | null> => {
      const sessionId = Symbol(nextWorkspaceId)
      sessionRef.current = sessionId
      controllerRef.current?.dispose()
      controllerRef.current = null
      setStatus("loading")
      setError(null)

      if (!preserveRows) {
        setSyncContext(null)
        setMembers([])
        setInvites([])
      }

      try {
        const nextSyncContext =
          await fetchWorkspacePeopleSyncContext(nextWorkspaceId)

        if (sessionRef.current !== sessionId) {
          return null
        }

        const controller = await createWorkspacePeopleSyncController({
          onData: (nextData) => {
            if (sessionRef.current !== sessionId) {
              return
            }

            applyLoadedData(nextData)
          },
          onError: (nextError) => {
            if (sessionRef.current !== sessionId) {
              return
            }

            setStatus("error")
            setError(
              describeWorkspacePeopleSyncError(
                nextError,
                "Unable to load workspace people sync context."
              )
            )
          },
          syncContext: nextSyncContext,
        })

        if (sessionRef.current !== sessionId) {
          controller.dispose()
          return null
        }

        controllerRef.current = controller
        const nextData = controller.readCurrentData()
        applyLoadedData(nextData)

        return nextData
      } catch (nextError) {
        if (sessionRef.current !== sessionId) {
          return null
        }

        if (!preserveRows) {
          setSyncContext(null)
          setMembers([])
          setInvites([])
        }

        setStatus("error")
        setError(
          describeWorkspacePeopleSyncError(
            nextError,
            "Unable to load workspace people sync context."
          )
        )

        return null
      }
    }
  )

  const refresh = useEffectEvent(async () => {
    if (!workspaceId) {
      return null
    }

    return await loadWorkspaceSync(workspaceId, true)
  })

  useEffect(() => {
    if (!workspaceId) {
      sessionRef.current = null
      controllerRef.current?.dispose()
      controllerRef.current = null
      setSyncContext(null)
      setStatus("idle")
      setError(null)
      setMembers([])
      setInvites([])
      return
    }

    loadWorkspaceSync(workspaceId)

    return () => {
      sessionRef.current = null
      controllerRef.current?.dispose()
      controllerRef.current = null
    }
  }, [workspaceId])

  const mutations = useMemo(() => createWorkspacePeopleSyncMutationClient(), [])

  const collections = useMemo(
    () => (syncContext ? createWorkspacePeopleCollections(syncContext) : null),
    [syncContext]
  )

  const value = useMemo(
    () => ({
      collections,
      error,
      invites,
      members,
      mutations,
      refresh,
      status,
      syncContext,
    }),
    [collections, error, invites, members, mutations, status, syncContext]
  )

  return (
    <WorkspacePeopleSyncContext.Provider value={value}>
      {children}
    </WorkspacePeopleSyncContext.Provider>
  )
}

const useWorkspacePeopleSync = () => {
  const value = useContext(WorkspacePeopleSyncContext)

  if (!value) {
    throw new Error(
      "useWorkspacePeopleSync must be used within a WorkspacePeopleSyncProvider."
    )
  }

  return value
}

export { WorkspacePeopleSyncProvider, useWorkspacePeopleSync }
export type {
  LoadedWorkspacePeopleSyncData,
  WorkspacePeopleSyncCollections,
  WorkspacePeopleSyncContextResponse,
  WorkspacePeopleSyncInvite,
  WorkspacePeopleSyncMember,
  WorkspacePeopleSyncStatus,
  WorkspacePeopleSyncValue,
}
