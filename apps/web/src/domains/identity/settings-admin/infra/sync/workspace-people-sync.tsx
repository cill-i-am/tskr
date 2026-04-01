import { fetchApiService } from "@/domains/shared/infra/api-service-client"
import {
  awaitWorkspaceElectricTxId,
  cleanupWorkspaceElectricCollections,
  createWorkspaceElectricCollection,
  preloadWorkspaceElectricCollections,
} from "@/domains/shared/infra/sync/workspace-electric-collection"
import type { WorkspaceElectricCollection } from "@/domains/shared/infra/sync/workspace-electric-collection"
import { Schema } from "effect"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { z } from "zod"

import { createWorkspacePeopleSyncMutationClient } from "./workspace-people-mutation-client"

interface WorkspacePeopleSyncContextResponse {
  resources: {
    workspace: string
    workspaceInvites: string
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

const workspacePeopleSyncContextResponseSchema = Schema.Struct({
  resources: Schema.Struct({
    workspace: Schema.String,
    workspaceInvites: Schema.String,
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

const workspacePeopleWorkspaceRowSchema = z.object({
  createdAt: z.string().optional(),
  id: z.string(),
  logo: z.string().nullable(),
  metadata: z.unknown().optional(),
  name: z.string(),
  slug: z.string(),
})

const workspacePeopleInviteRowSchema = z.object({
  code: z.string(),
  createdAt: z.string().optional(),
  email: z.string(),
  expiresAt: z.string().optional(),
  id: z.string(),
  inviterId: z.string().optional(),
  organizationId: z.string(),
  role: z.string(),
  status: z.string(),
})

const workspacePeopleMemberRowSchema = z.object({
  createdAt: z.string().optional(),
  id: z.string(),
  organizationId: z.string(),
  role: z.string(),
  userId: z.string(),
})

type WorkspacePeopleInviteCollection = WorkspaceElectricCollection<
  typeof workspacePeopleInviteRowSchema
>
type WorkspacePeopleMemberCollection = WorkspaceElectricCollection<
  typeof workspacePeopleMemberRowSchema
>
type WorkspacePeopleWorkspaceCollection = WorkspaceElectricCollection<
  typeof workspacePeopleWorkspaceRowSchema
>

interface WorkspacePeopleSyncCollections {
  invites: WorkspacePeopleInviteCollection
  members: WorkspacePeopleMemberCollection
  workspace: WorkspacePeopleWorkspaceCollection
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

const WorkspacePeopleSyncContext =
  createContext<WorkspacePeopleSyncValue | null>(null)

const createWorkspacePeopleCollections = (
  syncContext: WorkspacePeopleSyncContextResponse
): WorkspacePeopleSyncCollections => ({
  invites: createWorkspaceElectricCollection({
    collectionId: `workspace-invites:${syncContext.workspace.id}`,
    getKey: (invite) => invite.id,
    resource: syncContext.resources.workspaceInvites,
    schema: workspacePeopleInviteRowSchema,
  }),
  members: createWorkspaceElectricCollection({
    collectionId: `workspace-members:${syncContext.workspace.id}`,
    getKey: (member) => member.id,
    resource: syncContext.resources.workspaceMembers,
    schema: workspacePeopleMemberRowSchema,
  }),
  workspace: createWorkspaceElectricCollection({
    collectionId: `workspace:${syncContext.workspace.id}`,
    getKey: (workspace) => workspace.id,
    resource: syncContext.resources.workspace,
    schema: workspacePeopleWorkspaceRowSchema,
  }),
})

const WorkspacePeopleSyncProvider = ({
  children,
  workspaceId,
}: WorkspacePeopleSyncProviderProps) => {
  const [syncContext, setSyncContext] =
    useState<WorkspacePeopleSyncContextResponse | null>(null)
  const [collections, setCollections] =
    useState<WorkspacePeopleSyncCollections | null>(null)
  const [status, setStatus] = useState<WorkspacePeopleSyncStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workspaceId) {
      setCollections(null)
      setSyncContext(null)
      setStatus("idle")
      setError(null)
      return
    }

    let isCancelled = false
    let activeCollections: WorkspacePeopleSyncCollections | null = null

    setCollections(null)
    setSyncContext(null)
    setStatus("loading")
    setError(null)

    const cleanupActiveCollections = async () => {
      if (!activeCollections) {
        return
      }

      const collectionsToCleanup = activeCollections
      activeCollections = null
      await cleanupWorkspaceElectricCollections(
        Object.values(collectionsToCleanup)
      )
    }

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

        activeCollections = createWorkspacePeopleCollections(payload)
        await preloadWorkspaceElectricCollections(
          Object.values(activeCollections)
        )

        if (isCancelled) {
          await cleanupActiveCollections()
          return
        }

        if (!isCancelled) {
          setCollections(activeCollections)
          setSyncContext(payload)
          setStatus("ready")
        }
      } catch (nextError) {
        await cleanupActiveCollections()

        if (!isCancelled) {
          setCollections(null)
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
      ;(async () => {
        try {
          await cleanupActiveCollections()
        } catch (cleanupError) {
          console.error(
            "Failed to clean up workspace people sync collections.",
            cleanupError
          )
        }
      })()
    }
  }, [workspaceId])

  const rawMutations = useMemo(
    () => createWorkspacePeopleSyncMutationClient(),
    []
  )
  const mutations = useMemo(() => {
    if (!collections) {
      return rawMutations
    }

    return {
      createWorkspaceInvite: async (
        ...args: Parameters<typeof rawMutations.createWorkspaceInvite>
      ) =>
        awaitWorkspaceElectricTxId(
          collections.invites,
          await rawMutations.createWorkspaceInvite(...args)
        ),
      removeWorkspaceMember: async (
        ...args: Parameters<typeof rawMutations.removeWorkspaceMember>
      ) =>
        awaitWorkspaceElectricTxId(
          collections.members,
          await rawMutations.removeWorkspaceMember(...args)
        ),
      resendWorkspaceInvite: async (
        ...args: Parameters<typeof rawMutations.resendWorkspaceInvite>
      ) =>
        awaitWorkspaceElectricTxId(
          collections.invites,
          await rawMutations.resendWorkspaceInvite(...args)
        ),
      revokeWorkspaceInvite: async (
        ...args: Parameters<typeof rawMutations.revokeWorkspaceInvite>
      ) =>
        awaitWorkspaceElectricTxId(
          collections.invites,
          await rawMutations.revokeWorkspaceInvite(...args)
        ),
      updateWorkspaceMemberRole: async (
        ...args: Parameters<typeof rawMutations.updateWorkspaceMemberRole>
      ) =>
        awaitWorkspaceElectricTxId(
          collections.members,
          await rawMutations.updateWorkspaceMemberRole(...args)
        ),
    }
  }, [collections, rawMutations])

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
