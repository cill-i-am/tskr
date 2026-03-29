import { HTTPException } from "hono/http-exception"

import {
  canManageOwnerRole,
  canManageWorkspaceInvites,
  canManageWorkspaceMembers,
  canManageWorkspaceSettings,
  hasRole,
} from "./authorization-policy.js"
import type {
  AcceptWorkspaceInviteRequest,
  UpdateAccountProfileRequest,
  UpdateWorkspaceMemberRoleResponse,
  UpdateWorkspaceProfileRequest,
  WorkspaceBootstrap,
  WorkspaceInvite,
  WorkspaceProfile,
  WorkspaceRole,
  WorkspaceSession,
  WorkspaceSettingsInvite,
  WorkspaceSettingsMember,
  WorkspaceSettingsSnapshot,
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
  api: Record<string, unknown>
}

type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>

interface CreateWorkspaceServiceOptions {
  auth: AuthAdapter
  buildWorkspaceInviteAcceptUrl: (code: string) => string
  repository: WorkspaceRepository
  verifyWorkspaceInviteToken: (token: string) => string | null
}

const normalizeWorkspaceName = (name: string) => name.trim()

const normalizeRequiredName = (name: string | undefined, label: string) => {
  const normalized = name?.trim() ?? ""

  if (!normalized) {
    throw new HTTPException(400, {
      message: `${label} is required.`,
    })
  }

  return normalized
}

const normalizeOptionalImage = (value: string | null | undefined) => {
  if (value === null || value === undefined) {
    return null
  }

  const normalized = value.trim()

  return normalized || null
}

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
  const authApi = auth.api as {
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
      code?: string
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
    const session = await authApi.getSession({ headers })

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

  const requireAccountProfile = async (userId: string) => {
    const profile = await repository.getAccountProfile(userId)

    if (!profile) {
      throw new HTTPException(404, {
        message: "Account profile not found.",
      })
    }

    return profile
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

  const requireWorkspaceSettingsAccess = async (
    headers: Headers,
    workspaceId: string
  ) => {
    const workspaceSession = await requireWorkspaceSession(headers)
    const membership = await requireWorkspaceMember(
      workspaceSession.userId,
      workspaceId
    )

    if (!canManageWorkspaceSettings(membership.role)) {
      throw new HTTPException(403, {
        message: "You are not allowed to manage settings for this workspace.",
      })
    }

    return {
      membership,
      workspaceSession,
    }
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

    let status: 400 | 401 | 403 | 404 | 409 = 400

    if (
      candidate.statusCode === 401 ||
      candidate.statusCode === 403 ||
      candidate.statusCode === 404 ||
      candidate.statusCode === 409
    ) {
      status = candidate.statusCode
    } else if (
      candidate.status === 401 ||
      candidate.status === 403 ||
      candidate.status === 404 ||
      candidate.status === 409
    ) {
      ;({ status } = candidate)
    }

    throw new HTTPException(status, {
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
    const organization = await authApi.createOrganization({
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

  const getAccountProfile = async (headers: Headers) => {
    const workspaceSession = await requireWorkspaceSession(headers)

    return requireAccountProfile(workspaceSession.userId)
  }

  const updateAccountProfile = async (
    headers: Headers,
    input: UpdateAccountProfileRequest
  ) => {
    const workspaceSession = await requireWorkspaceSession(headers)
    const name = normalizeRequiredName(input.name, "Account name")
    const profile = await repository.updateAccountProfile(
      workspaceSession.userId,
      {
        image: normalizeOptionalImage(input.image),
        name,
      }
    )

    if (!profile) {
      throw new HTTPException(404, {
        message: "Account profile not found.",
      })
    }

    return profile
  }

  const resolveInvitableRoles = (actorRole: string): WorkspaceRole[] => {
    if (!canManageWorkspaceInvites(actorRole)) {
      return []
    }

    if (canManageOwnerRole(actorRole)) {
      return ["owner", "admin", "dispatcher", "field_worker"]
    }

    return ["admin", "dispatcher", "field_worker"]
  }

  const resolveAssignableRoles = ({
    actorRole,
    ownerCount,
    targetRole,
    targetUserId,
    workspaceSession,
  }: {
    actorRole: string
    ownerCount: number
    targetRole: string
    targetUserId: string
    workspaceSession: WorkspaceSession
  }): WorkspaceRole[] => {
    if (!canManageWorkspaceMembers(actorRole)) {
      return []
    }

    const isCurrentUser = targetUserId === workspaceSession.userId
    const targetIsOwner = hasRole(targetRole, "owner")

    if (!canManageOwnerRole(actorRole)) {
      if (targetIsOwner) {
        return []
      }

      return ["admin", "dispatcher", "field_worker"]
    }

    if (isCurrentUser && targetIsOwner) {
      return []
    }

    if (targetIsOwner && ownerCount <= 1) {
      return []
    }

    return ["owner", "admin", "dispatcher", "field_worker"]
  }

  const canRemoveTargetMember = ({
    actorRole,
    ownerCount,
    targetRole,
    targetUserId,
    workspaceSession,
  }: {
    actorRole: string
    ownerCount: number
    targetRole: string
    targetUserId: string
    workspaceSession: WorkspaceSession
  }) => {
    const isCurrentUser = targetUserId === workspaceSession.userId
    const targetIsOwner = hasRole(targetRole, "owner")

    if (isCurrentUser) {
      if (targetIsOwner) {
        return ownerCount > 1
      }

      return true
    }

    if (!canManageWorkspaceMembers(actorRole)) {
      return false
    }

    if (!canManageOwnerRole(actorRole) && targetIsOwner) {
      return false
    }

    return true
  }

  const buildWorkspaceSettingsInvite = ({
    actorRole,
    invite,
  }: {
    actorRole: string
    invite: {
      code: string
      email: string
      id: string
      role: WorkspaceRole
      status: string
      workspaceId: string
    }
  }): WorkspaceSettingsInvite => {
    const canManageInvite =
      canManageWorkspaceInvites(actorRole) &&
      (invite.role !== "owner" || canManageOwnerRole(actorRole))

    return {
      acceptUrl: buildWorkspaceInviteAcceptUrl(invite.code),
      code: invite.code,
      email: invite.email,
      id: invite.id,
      permissions: {
        canResend: canManageInvite,
        canRevoke: canManageInvite,
      },
      role: invite.role,
      status: invite.status,
      workspaceId: invite.workspaceId,
    }
  }

  const buildWorkspaceSettingsSnapshot = async ({
    membership,
    workspaceSession,
  }: {
    membership: {
      role: string
    }
    workspaceSession: WorkspaceSession
  }): Promise<WorkspaceSettingsSnapshot> => {
    const [
      accountProfile,
      workspaceProfile,
      ownerCount,
      members,
      pendingInvites,
    ] = await Promise.all([
      requireAccountProfile(workspaceSession.userId),
      repository.findWorkspaceProfile(workspaceSession.activeWorkspaceId ?? ""),
      repository.countWorkspaceOwners(workspaceSession.activeWorkspaceId ?? ""),
      repository.listWorkspaceMembers(workspaceSession.activeWorkspaceId ?? ""),
      repository.listWorkspacePendingInvites(
        workspaceSession.activeWorkspaceId ?? ""
      ),
    ])

    if (!workspaceSession.activeWorkspaceId || !workspaceProfile) {
      throw new HTTPException(404, {
        message: "Workspace not found.",
      })
    }

    const settingsMembers: WorkspaceSettingsMember[] = members.map((member) => {
      const assignableRoles = resolveAssignableRoles({
        actorRole: membership.role,
        ownerCount,
        targetRole: member.role,
        targetUserId: member.userId,
        workspaceSession,
      })

      return {
        ...member,
        isCurrentUser: member.userId === workspaceSession.userId,
        permissions: {
          assignableRoles,
          canChangeRole: assignableRoles.length > 0,
          canRemove: canRemoveTargetMember({
            actorRole: membership.role,
            ownerCount,
            targetRole: member.role,
            targetUserId: member.userId,
            workspaceSession,
          }),
        },
      }
    })

    return {
      accountProfile,
      members: settingsMembers,
      pendingInvites: pendingInvites.map((invite) =>
        buildWorkspaceSettingsInvite({
          actorRole: membership.role,
          invite: {
            code: invite.code,
            email: invite.email,
            id: invite.id,
            role: invite.role,
            status: invite.status,
            workspaceId: invite.workspaceId,
          },
        })
      ),
      permissions: {
        canEditWorkspaceProfile: canManageWorkspaceSettings(membership.role),
        canInviteRoles: resolveInvitableRoles(membership.role),
        canManageInvites: canManageWorkspaceInvites(membership.role),
        canManageMembers: canManageWorkspaceMembers(membership.role),
      },
      viewerRole: membership.role as WorkspaceRole,
      workspaceProfile,
    }
  }

  const getWorkspaceSettings = async (
    headers: Headers,
    workspaceId: string
  ) => {
    const { membership, workspaceSession } =
      await requireWorkspaceSettingsAccess(headers, workspaceId)

    return buildWorkspaceSettingsSnapshot({
      membership,
      workspaceSession: {
        ...workspaceSession,
        activeWorkspaceId: workspaceId,
      },
    })
  }

  const updateWorkspaceProfile = async (
    headers: Headers,
    workspaceId: string,
    input: UpdateWorkspaceProfileRequest
  ): Promise<WorkspaceProfile> => {
    await requireWorkspaceSettingsAccess(headers, workspaceId)

    const workspaceProfile = await repository.updateWorkspaceProfile(
      workspaceId,
      {
        logo: normalizeOptionalImage(input.logo),
        name: normalizeRequiredName(input.name, "Workspace name"),
      }
    )

    if (!workspaceProfile) {
      throw new HTTPException(404, {
        message: "Workspace not found.",
      })
    }

    return workspaceProfile
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
      const invitation = await authApi.createInvitation({
        body: {
          email: email.trim().toLowerCase(),
          organizationId: workspaceId,
          role,
        },
        headers,
      })
      const existingInvitation = await repository.findInvitationById(
        invitation.id
      )
      const invitationCode =
        typeof invitation.code === "string" && invitation.code
          ? invitation.code
          : existingInvitation?.code

      if (!invitationCode) {
        throw new HTTPException(500, {
          message: "Invite code not available.",
        })
      }

      return buildWorkspaceInvite({
        code: invitationCode,
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
      await authApi.createInvitation({
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
      await authApi.cancelInvitation({
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
    input: AcceptWorkspaceInviteRequest
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
      await authApi.acceptInvitation({
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
  ): Promise<UpdateWorkspaceMemberRoleResponse> => {
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

    if (
      targetMembership.userId === workspaceSession.userId &&
      hasRole(targetMembership.role, "owner")
    ) {
      throw new HTTPException(403, {
        message: "Owners cannot change their own owner role.",
      })
    }

    try {
      const updatedMember = await authApi.updateMemberRole({
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
        await authApi.leaveOrganization({
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
      await authApi.removeMember({
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
    getAccountProfile,
    getWorkspaceBootstrap,
    getWorkspaceSettings,
    normalizeWorkspaceName,
    removeMember,
    resendInvite,
    revokeInvite,
    updateAccountProfile,
    updateActiveWorkspace,
    updateMemberRole,
    updateWorkspaceProfile,
  }
}

export { createWorkspaceService, normalizeWorkspaceName }
