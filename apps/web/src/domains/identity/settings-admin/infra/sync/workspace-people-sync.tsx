import { fetchApiService } from "@/domains/shared/infra/api-service-client"
import { Schema } from "effect"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

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

type WorkspacePeopleSyncStatus = "idle" | "loading" | "ready" | "error"

interface WorkspacePeopleSyncValue {
  collections: WorkspacePeopleSyncCollections | null
  error: string | null
  mutations: ReturnType<typeof createWorkspacePeopleSyncMutationClient>
  status: WorkspacePeopleSyncStatus
  syncContext: WorkspacePeopleSyncContextResponse | null
}

interface WorkspacePeopleSyncProviderProps {
  children: React.ReactNode
  workspaceId: string | null
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

const WorkspacePeopleSyncProvider = ({
  children,
  workspaceId,
}: WorkspacePeopleSyncProviderProps) => {
  const [syncContext, setSyncContext] =
    useState<WorkspacePeopleSyncContextResponse | null>(null)
  const [status, setStatus] = useState<WorkspacePeopleSyncStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workspaceId) {
      setSyncContext(null)
      setStatus("idle")
      setError(null)
      return
    }

    let isCancelled = false

    setSyncContext(null)
    setStatus("loading")
    setError(null)

    const loadSyncContext = async () => {
      try {
        const response = await fetchApiService(
          `/api/sync/workspaces/${workspaceId}/context`
        )

        if (!response.ok) {
          throw new Error(
            `Unable to load workspace people sync context (${response.status}).`
          )
        }

        const payload = Schema.decodeUnknownSync(
          workspacePeopleSyncContextResponseSchema
        )(await response.json())

        if (!isCancelled) {
          setSyncContext(payload)
          setStatus("ready")
        }
      } catch (nextError) {
        if (!isCancelled) {
          setSyncContext(null)
          setStatus("error")
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Unable to load workspace people sync context."
          )
        }
      }
    }

    loadSyncContext()

    return () => {
      isCancelled = true
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
      mutations,
      status,
      syncContext,
    }),
    [collections, error, mutations, status, syncContext]
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
  WorkspacePeopleSyncCollections,
  WorkspacePeopleSyncContextResponse,
  WorkspacePeopleSyncStatus,
  WorkspacePeopleSyncValue,
}
