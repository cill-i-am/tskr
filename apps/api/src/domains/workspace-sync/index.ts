import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
])

const SYNC_RESOURCE_PATHS = {
  workspace: "workspace",
  workspaceInvites: "workspace-invites",
  workspaceMembers: "workspace-members",
} as const

type WorkspaceSyncResource =
  | (typeof SYNC_RESOURCE_PATHS)["workspace"]
  | (typeof SYNC_RESOURCE_PATHS)["workspaceInvites"]
  | (typeof SYNC_RESOURCE_PATHS)["workspaceMembers"]

interface WorkspaceSyncContext {
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

interface WorkspaceSettingsSnapshot {
  accountProfile?: {
    id?: string
  }
  members?: {
    userId?: string
  }[]
  viewerRole?: string
  workspaceProfile?: {
    id?: string
    logo?: string | null
    name?: string
    slug?: string
  }
}

interface ValidatedWorkspaceSettingsSnapshot {
  accountProfile: {
    id: string
  }
  members?: {
    userId?: string
  }[]
  viewerRole: string
  workspaceProfile: {
    id: string
    logo?: string | null
    name: string
    slug: string
  }
}

interface CreateWorkspaceSyncServiceOptions {
  authBaseUrl?: string
  electricBaseUrl?: string
  electricSecret?: string
  fetch?: typeof globalThis.fetch
}

interface WorkspaceSyncService {
  getSyncContext(input: {
    headers: Headers
    workspaceId: string
  }): Promise<WorkspaceSyncContext>
  proxyShape(input: {
    headers: Headers
    query: URLSearchParams
    resource: string
    workspaceId: string
  }): Promise<Response>
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/u, "")

const resolveAuthBaseUrl = (override?: string) =>
  trimTrailingSlash(
    override ?? process.env.SERVER_AUTH_BASE_URL ?? "http://localhost:3002"
  )

const resolveElectricBaseUrl = (override?: string) => {
  const resolved = override ?? process.env.ELECTRIC_URL

  if (typeof resolved !== "string" || resolved.trim().length === 0) {
    throw new HTTPException(503, {
      message: "Workspace sync is not configured for this environment.",
    })
  }

  return trimTrailingSlash(resolved)
}

const resolveElectricSecret = (override?: string) =>
  override ?? process.env.ELECTRIC_SECRET

const getFetchImplementation = (override?: typeof globalThis.fetch) =>
  override ?? globalThis.fetch

const buildContextResourcePaths = (workspaceId: string) => ({
  workspace: `/api/sync/workspaces/${workspaceId}/shapes/workspace`,
  workspaceInvites: `/api/sync/workspaces/${workspaceId}/shapes/workspace-invites`,
  workspaceMembers: `/api/sync/workspaces/${workspaceId}/shapes/workspace-members`,
})

const getAuthForwardedHeaders = (headers: Headers) => {
  const forwardedHeaders = new Headers()

  for (const headerName of ["accept", "cookie", "if-none-match"]) {
    const value = headers.get(headerName)

    if (value) {
      forwardedHeaders.set(headerName, value)
    }
  }

  return forwardedHeaders
}

const getElectricForwardedHeaders = (headers: Headers) => {
  const forwardedHeaders = new Headers()

  for (const headerName of ["accept", "if-none-match"]) {
    const value = headers.get(headerName)

    if (value) {
      forwardedHeaders.set(headerName, value)
    }
  }

  return forwardedHeaders
}

const readErrorMessage = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    const payload = (await response.clone().json()) as {
      message?: unknown
    }

    if (typeof payload.message === "string" && payload.message) {
      return payload.message
    }
  }

  const text = await response.text()

  return text || `Upstream request failed with status ${response.status}.`
}

const toHttpException = async (response: Response) =>
  new HTTPException(
    response.status as ConstructorParameters<typeof HTTPException>[0],
    {
      message: await readErrorMessage(response),
    }
  )

const requireWorkspaceSettingsSnapshot = (
  snapshot: WorkspaceSettingsSnapshot
): ValidatedWorkspaceSettingsSnapshot => {
  if (
    !snapshot.accountProfile?.id ||
    !snapshot.workspaceProfile?.id ||
    typeof snapshot.workspaceProfile.name !== "string" ||
    typeof snapshot.workspaceProfile.slug !== "string" ||
    typeof snapshot.viewerRole !== "string"
  ) {
    throw new HTTPException(502, {
      message: "Auth returned an invalid workspace sync snapshot.",
    })
  }

  return snapshot as ValidatedWorkspaceSettingsSnapshot
}

const buildShapeSearchParams = ({
  columns,
  electricSecret,
  query,
  table,
  where,
  whereParams = [],
}: {
  columns: string
  electricSecret?: string
  query: URLSearchParams
  table: string
  where: string
  whereParams?: string[]
}) => {
  const searchParams = new URLSearchParams()

  for (const [key, value] of query) {
    if (key === "columns" || key === "secret") {
      continue
    }

    if (key === "table" || key === "where" || key.startsWith("params[")) {
      continue
    }

    searchParams.append(key, value)
  }

  searchParams.set("table", table)
  searchParams.set("where", where)
  searchParams.set("columns", columns)

  for (const [index, value] of whereParams.entries()) {
    searchParams.set(`params[${index + 1}]`, value)
  }

  if (electricSecret) {
    searchParams.set("secret", electricSecret)
  }

  return searchParams
}

const createWorkspaceSyncService = (
  options: CreateWorkspaceSyncServiceOptions = {}
): WorkspaceSyncService => {
  const getWorkspaceSettingsSnapshot = async (
    headers: Headers,
    workspaceId: string
  ) => {
    const response = await getFetchImplementation(options.fetch)(
      new URL(
        `/api/workspaces/${workspaceId}/settings`,
        resolveAuthBaseUrl(options.authBaseUrl)
      ).toString(),
      {
        credentials: "include",
        headers: getAuthForwardedHeaders(headers),
      }
    )

    if (!response.ok) {
      throw await toHttpException(response)
    }

    return requireWorkspaceSettingsSnapshot(
      (await response.json()) as WorkspaceSettingsSnapshot
    )
  }

  return {
    async getSyncContext({ headers, workspaceId }) {
      const snapshot = await getWorkspaceSettingsSnapshot(headers, workspaceId)

      return {
        resources: buildContextResourcePaths(workspaceId),
        userId: snapshot.accountProfile.id,
        viewerRole: snapshot.viewerRole ?? "unknown",
        workspace: {
          id: snapshot.workspaceProfile.id,
          logo: snapshot.workspaceProfile.logo ?? null,
          name: snapshot.workspaceProfile.name,
          slug: snapshot.workspaceProfile.slug,
        },
      }
    },
    async proxyShape({ headers, query, resource, workspaceId }) {
      if (
        !Object.values(SYNC_RESOURCE_PATHS).includes(
          resource as WorkspaceSyncResource
        )
      ) {
        throw new HTTPException(404, {
          message: `Unsupported sync resource: ${resource}.`,
        })
      }
      const electricBaseUrl = resolveElectricBaseUrl(options.electricBaseUrl)
      await getWorkspaceSettingsSnapshot(headers, workspaceId)
      const resolvedShapeInput = (() => {
        switch (resource as WorkspaceSyncResource) {
          case SYNC_RESOURCE_PATHS.workspace: {
            return {
              columns: "id,name,slug,logo,metadata,created_at",
              table: "auth.organization",
              where: "id = $1",
              whereParams: [workspaceId],
            }
          }
          case SYNC_RESOURCE_PATHS.workspaceInvites: {
            return {
              columns:
                "id,organization_id,email,role,status,code,expires_at,inviter_id,created_at",
              table: "auth.invitation",
              where: "organization_id = $1 AND status = $2",
              whereParams: [workspaceId, "pending"],
            }
          }
          case SYNC_RESOURCE_PATHS.workspaceMembers: {
            return {
              columns: "id,organization_id,user_id,role,created_at",
              table: "auth.member",
              where: "organization_id = $1",
              whereParams: [workspaceId],
            }
          }
          default: {
            throw new HTTPException(404, {
              message: `Unsupported sync resource: ${resource}.`,
            })
          }
        }
      })()

      const upstreamResponse = await getFetchImplementation(options.fetch)(
        `${new URL(
          "/v1/shape",
          electricBaseUrl
        ).toString()}?${buildShapeSearchParams({
          columns: resolvedShapeInput.columns,
          electricSecret: resolveElectricSecret(options.electricSecret),
          query,
          table: resolvedShapeInput.table,
          where: resolvedShapeInput.where,
          whereParams: resolvedShapeInput.whereParams,
        }).toString()}`,
        {
          headers: getElectricForwardedHeaders(headers),
        }
      )

      return new Response(upstreamResponse.body, {
        headers: new Headers(
          [...upstreamResponse.headers].filter(
            ([key]) => !HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())
          )
        ),
        status: upstreamResponse.status,
      })
    },
  }
}

const createWorkspaceSyncRoutes = ({
  service,
}: {
  service: WorkspaceSyncService
}) =>
  new Hono()
    .get("/api/sync/workspaces/:workspaceId/context", async (context) =>
      context.json(
        await service.getSyncContext({
          headers: context.req.raw.headers,
          workspaceId: context.req.param("workspaceId"),
        })
      )
    )
    .get("/api/sync/workspaces/:workspaceId/shapes/:resource", (context) =>
      service.proxyShape({
        headers: context.req.raw.headers,
        query: new URL(context.req.url).searchParams,
        resource: context.req.param("resource"),
        workspaceId: context.req.param("workspaceId"),
      })
    )

export {
  createWorkspaceSyncRoutes,
  createWorkspaceSyncService,
  SYNC_RESOURCE_PATHS,
}
export type { WorkspaceSyncContext, WorkspaceSyncService }
