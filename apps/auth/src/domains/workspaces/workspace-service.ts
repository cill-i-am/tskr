import { HTTPException } from "hono/http-exception"

import {
  canManageOwnerRole,
  canManageWorkspaceInvites,
  canManageWorkspaceMembers,
  hasRole,
} from "./authorization-policy.js"
import type {
  WorkspaceBootstrap,
  WorkspaceInvite,
  WorkspaceRole,
  WorkspaceSession,
} from "./contracts.js"
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
    acceptInvitation(input: {
      body: {
        invitationId: string
      }
      headers: Headers
    }): Promise<unknown>
    cancelInvitation(input: {
      body: {
        invitationId: string
      }
      headers: Headers
    }): Promise<unknown>
    createOrganization(input: {
      body: {
        name: string
        slug: string
      }
      headers: Headers
    }): Promise<{
      id: string
    } | null>
    createInvitation(input: {
      body: {
        email: string
        organizationId: string
        resend?: boolean
        role: WorkspaceRole
      }
      headers: Headers
    }): Promise<{
      code: string
      email: string
      id: string
      role: string
      status: string
    }>
    getSession(input: { headers: Headers }): Promise<AuthSession | null>
    leaveOrganization(input: {
      body: {
        organizationId: string
      }
      headers: Headers
    }): Promise<unknown>
    removeMember(input: {
      body: {
        memberIdOrEmail: string
        organizationId: string
      }
      headers: Headers
    }): Promise<unknown>
    updateMemberRole(input: {
      body: {
        memberId: string
        organizationId: string
        role: WorkspaceRole
      }
      headers: Headers
    }): Promise<{
      id: string
      organizationId: string
      role: string
    }>
  }
}

type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>

interface CreateWorkspaceServiceOptions {
  auth: AuthAdapter
  buildWorkspaceInviteAcceptUrl: (code: string) => string
  repository: WorkspaceRepository
  verifyWorkspaceInviteToken: (token: string) => string | null
}

interface AcceptWorkspaceInviteInput {
  code?: string
  token?: string
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
  buildWorkspaceInviteAcceptUrl,
  repository,
  verifyWorkspaceInviteToken,
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

  const requireWorkspaceSession = async (headers: Headers) => {
    const workspaceSession = await getWorkspaceSession(headers)

    if (!workspaceSession) {
      throw new HTTPException(401, {
        message: "Authentication is required.",
      })
    }

    return workspaceSession
  }

  const requireWorkspaceMember = async (
    userId: string,
    workspaceId: string
  ) => {
    const membership = await repository.findMembershipByUserAndWorkspace(
      userId,
      workspaceId
    )

    if (!membership) {
      throw new HTTPException(403, {
        message: "You are not a member of that workspace.",
      })
    }

    return membership
  }

  const buildWorkspaceInvite = ({
    code,
    email,
    id,
    role,
    status,
    workspaceId,
  }: {
    code: string
    email: string
    id: string
    role: WorkspaceRole
    status: string
    workspaceId: string
  }): WorkspaceInvite => ({
    acceptUrl: buildWorkspaceInviteAcceptUrl(code),
    code,
    email,
    id,
    role,
    status,
    workspaceId,
  })

  const mapBetterAuthError = (error: unknown): never => {
    const candidate = error as {
      body?: {
        code?: string
        message?: string
      }
      message?: string
      status?: number
      statusCode?: number
    }

    throw new HTTPException(candidate.statusCode ?? candidate.status ?? 400, {
      message:
        candidate.body?.message ??
        candidate.message ??
        "Workspace request failed.",
    })
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

  const createInvite = async (
    headers: Headers,
    workspaceId: string,
    email: string,
    role: WorkspaceRole
  ) => {
    const workspaceSession = await requireWorkspaceSession(headers)
    const membership = await requireWorkspaceMember(
      workspaceSession.userId,
      workspaceId
    )

    if (!canManageWorkspaceInvites(membership.role)) {
      throw new HTTPException(403, {
        message: "You are not allowed to manage invites for this workspace.",
      })
    }

    if (role === "owner" && !canManageOwnerRole(membership.role)) {
      throw new HTTPException(403, {
        message: "Only owners can invite another owner.",
      })
    }

    try {
      const invitation = await auth.api.createInvitation({
        body: {
          email: email.trim().toLowerCase(),
          organizationId: workspaceId,
          role,
        },
        headers,
      })

      return buildWorkspaceInvite({
        code: invitation.code,
        email: invitation.email,
        id: invitation.id,
        role,
        status: invitation.status,
        workspaceId,
      })
    } catch (error) {
      mapBetterAuthError(error)
    }
  }

  const resendInvite = async (
    headers: Headers,
    workspaceId: string,
    inviteId: string
  ) => {
    const workspaceSession = await requireWorkspaceSession(headers)
    const membership = await requireWorkspaceMember(
      workspaceSession.userId,
      workspaceId
    )

    if (!canManageWorkspaceInvites(membership.role)) {
      throw new HTTPException(403, {
        message: "You are not allowed to manage invites for this workspace.",
      })
    }

    const invitation = await repository.findInvitationById(inviteId)

    if (
      !invitation ||
      invitation.workspaceId !== workspaceId ||
      invitation.status !== "pending" ||
      !invitation.role
    ) {
      throw new HTTPException(404, {
        message: "Invite not found.",
      })
    }

    if (invitation.role === "owner" && !canManageOwnerRole(membership.role)) {
      throw new HTTPException(403, {
        message: "Only owners can resend owner invites.",
      })
    }

    try {
      await auth.api.createInvitation({
        body: {
          email: invitation.email,
          organizationId: workspaceId,
          resend: true,
          role: invitation.role,
        },
        headers,
      })
    } catch (error) {
      mapBetterAuthError(error)
    }
  }

  const revokeInvite = async (
    headers: Headers,
    workspaceId: string,
    inviteId: string
  ) => {
    const workspaceSession = await requireWorkspaceSession(headers)
    const membership = await requireWorkspaceMember(
      workspaceSession.userId,
      workspaceId
    )

    if (!canManageWorkspaceInvites(membership.role)) {
      throw new HTTPException(403, {
        message: "You are not allowed to manage invites for this workspace.",
      })
    }

    const invitation = await repository.findInvitationById(inviteId)

    if (
      !invitation ||
      invitation.workspaceId !== workspaceId ||
      invitation.status !== "pending"
    ) {
      throw new HTTPException(404, {
        message: "Invite not found.",
      })
    }

    if (invitation.role === "owner" && !canManageOwnerRole(membership.role)) {
      throw new HTTPException(403, {
        message: "Only owners can revoke owner invites.",
      })
    }

    try {
      await auth.api.cancelInvitation({
        body: {
          invitationId: inviteId,
        },
        headers,
      })
    } catch (error) {
      mapBetterAuthError(error)
    }
  }

  const acceptInvite = async (
    headers: Headers,
    input: AcceptWorkspaceInviteInput
  ) => {
    let inviteCode: string | null = null

    if (typeof input.code === "string" && input.code.trim()) {
      inviteCode = input.code.trim()
    } else if (typeof input.token === "string" && input.token.trim()) {
      inviteCode = verifyWorkspaceInviteToken(input.token.trim())
    }

    if (!inviteCode) {
      throw new HTTPException(400, {
        message: "Invite code or token is required.",
      })
    }

    const invitation = await repository.findInvitationByCode(inviteCode)

    if (
      !invitation ||
      invitation.status !== "pending" ||
      invitation.expiresAt < new Date()
    ) {
      throw new HTTPException(400, {
        message: "Invite not found.",
      })
    }

    const workspaceSession = await requireWorkspaceSession(headers)

    if (
      invitation.email.toLowerCase() !== workspaceSession.email.toLowerCase()
    ) {
      throw new HTTPException(403, {
        message: "You are not the recipient of that invite.",
      })
    }

    try {
      await auth.api.acceptInvitation({
        body: {
          invitationId: invitation.id,
        },
        headers,
      })
    } catch (error) {
      mapBetterAuthError(error)
    }

    const refreshedSession = await requireWorkspaceSession(headers)

    return buildWorkspaceBootstrap(refreshedSession)
  }

  const updateMemberRole = async (
    headers: Headers,
    workspaceId: string,
    memberId: string,
    role: WorkspaceRole
  ) => {
    const workspaceSession = await requireWorkspaceSession(headers)
    const actorMembership = await requireWorkspaceMember(
      workspaceSession.userId,
      workspaceId
    )

    if (!canManageWorkspaceMembers(actorMembership.role)) {
      throw new HTTPException(403, {
        message: "You are not allowed to manage members for this workspace.",
      })
    }

    const targetMembership = await repository.findMembershipById(memberId)

    if (!targetMembership || targetMembership.workspaceId !== workspaceId) {
      throw new HTTPException(404, {
        message: "Member not found.",
      })
    }

    if (
      !canManageOwnerRole(actorMembership.role) &&
      (hasRole(targetMembership.role, "owner") || role === "owner")
    ) {
      throw new HTTPException(403, {
        message: "Only owners can change owner roles.",
      })
    }

    try {
      const updatedMember = await auth.api.updateMemberRole({
        body: {
          memberId,
          organizationId: workspaceId,
          role,
        },
        headers,
      })

      return {
        memberId: updatedMember.id,
        role,
        workspaceId,
      }
    } catch (error) {
      mapBetterAuthError(error)
    }
  }

  const removeMember = async (
    headers: Headers,
    workspaceId: string,
    memberId: string
  ) => {
    const workspaceSession = await requireWorkspaceSession(headers)
    const actorMembership = await requireWorkspaceMember(
      workspaceSession.userId,
      workspaceId
    )
    const targetMembership = await repository.findMembershipById(memberId)

    if (!targetMembership || targetMembership.workspaceId !== workspaceId) {
      throw new HTTPException(404, {
        message: "Member not found.",
      })
    }

    if (targetMembership.id === actorMembership.id) {
      try {
        await auth.api.leaveOrganization({
          body: {
            organizationId: workspaceId,
          },
          headers,
        })
        return
      } catch (error) {
        mapBetterAuthError(error)
      }
    }

    if (!canManageWorkspaceMembers(actorMembership.role)) {
      throw new HTTPException(403, {
        message: "You are not allowed to manage members for this workspace.",
      })
    }

    if (
      !canManageOwnerRole(actorMembership.role) &&
      hasRole(targetMembership.role, "owner")
    ) {
      throw new HTTPException(403, {
        message: "Only owners can remove another owner.",
      })
    }

    try {
      await auth.api.removeMember({
        body: {
          memberIdOrEmail: memberId,
          organizationId: workspaceId,
        },
        headers,
      })
    } catch (error) {
      mapBetterAuthError(error)
    }
  }

  return {
    acceptInvite,
    createInvite,
    createWorkspace,
    getWorkspaceBootstrap,
    normalizeWorkspaceName,
    removeMember,
    resendInvite,
    revokeInvite,
    updateActiveWorkspace,
    updateMemberRole,
  }
}

export { createWorkspaceService, normalizeWorkspaceName }
