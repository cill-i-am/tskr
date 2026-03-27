import type { WorkspaceBootstrap, WorkspaceSession } from "./contracts.js"
import { recoverActiveWorkspace } from "./recovery-policy.js"
import type { createWorkspaceRepository } from "./workspace-repository.js"

const MAX_SLUG_LENGTH = 64

interface AuthSession {
  session: {
    activeOrganizationId?: string | null
    token: string
  }
  user: {
    email: string
    id: string
  }
}

interface AuthAdapter {
  api: {
    createOrganization(input: {
      body: {
        name: string
        slug: string
      }
      headers: Headers
    }): Promise<{
      id: string
    } | null>
    getSession(input: { headers: Headers }): Promise<AuthSession | null>
  }
}

type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>

interface CreateWorkspaceServiceOptions {
  auth: AuthAdapter
  repository: WorkspaceRepository
}

const normalizeWorkspaceName = (name: string) => name.trim()

const slugifyWorkspaceName = (name: string) => {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)

  return slug || "workspace"
}

const createWorkspaceService = ({
  auth,
  repository,
}: CreateWorkspaceServiceOptions) => {
  const resolveAvailableWorkspaceSlug = async (name: string) => {
    const baseSlug = slugifyWorkspaceName(name)
    let slug = baseSlug
    let suffix = 2

    while (await repository.workspaceSlugExists(slug)) {
      const suffixPart = `-${suffix}`
      const trimmedBaseSlug = baseSlug.slice(
        0,
        MAX_SLUG_LENGTH - suffixPart.length
      )

      slug = `${trimmedBaseSlug}${suffixPart}`
      suffix += 1
    }

    return slug
  }

  const getWorkspaceSession = async (
    headers: Headers
  ): Promise<WorkspaceSession | null> => {
    const session = await auth.api.getSession({ headers })

    if (!session) {
      return null
    }

    return {
      activeWorkspaceId: session.session.activeOrganizationId ?? null,
      email: session.user.email,
      token: session.session.token,
      userId: session.user.id,
    }
  }

  const buildWorkspaceBootstrap = async (
    workspaceSession: WorkspaceSession
  ): Promise<WorkspaceBootstrap> => {
    const memberships = await repository.listMemberships(
      workspaceSession.userId
    )
    const recovery = recoverActiveWorkspace({
      activeWorkspaceId: workspaceSession.activeWorkspaceId,
      memberships,
    })

    if (recovery.nextActiveWorkspaceId !== workspaceSession.activeWorkspaceId) {
      await repository.setActiveWorkspace(
        workspaceSession.token,
        recovery.nextActiveWorkspaceId
      )
    }

    const activeWorkspace =
      memberships.find(
        (membership) => membership.id === recovery.nextActiveWorkspaceId
      ) ?? null

    return {
      activeWorkspace,
      memberships,
      pendingInvites: await repository.listPendingInvites(
        workspaceSession.email
      ),
      recoveryState: recovery.recoveryState,
    }
  }

  const getWorkspaceBootstrap = async (headers: Headers) => {
    const workspaceSession = await getWorkspaceSession(headers)

    if (!workspaceSession) {
      return null
    }

    return buildWorkspaceBootstrap(workspaceSession)
  }

  const createWorkspace = async (headers: Headers, workspaceName: string) => {
    const workspaceSession = await getWorkspaceSession(headers)

    if (!workspaceSession) {
      throw new Error("Expected an authenticated workspace session")
    }

    const normalizedName = normalizeWorkspaceName(workspaceName)
    const slug = await resolveAvailableWorkspaceSlug(normalizedName)
    const organization = await auth.api.createOrganization({
      body: {
        name: normalizedName,
        slug,
      },
      headers,
    })

    return buildWorkspaceBootstrap({
      ...workspaceSession,
      activeWorkspaceId: organization?.id ?? null,
    })
  }

  const updateActiveWorkspace = async (
    headers: Headers,
    workspaceId: string | null
  ) => {
    const workspaceSession = await getWorkspaceSession(headers)

    if (!workspaceSession) {
      return null
    }

    const memberships = await repository.listMemberships(
      workspaceSession.userId
    )

    if (workspaceId !== null) {
      const membership = memberships.find(
        (candidate) => candidate.id === workspaceId
      )

      if (!membership) {
        return {
          bootstrap: null,
          status: "forbidden" as const,
        }
      }
    }

    await repository.setActiveWorkspace(workspaceSession.token, workspaceId)

    return {
      bootstrap: await buildWorkspaceBootstrap({
        ...workspaceSession,
        activeWorkspaceId: workspaceId,
      }),
      status: "ok" as const,
    }
  }

  return {
    createWorkspace,
    getWorkspaceBootstrap,
    normalizeWorkspaceName,
    updateActiveWorkspace,
  }
}

export { createWorkspaceService, normalizeWorkspaceName }
