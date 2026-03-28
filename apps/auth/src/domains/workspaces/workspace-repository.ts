import type {
  PendingWorkspaceInvite,
  WorkspaceMembership,
  WorkspaceRole,
} from "./contracts.js"

interface Queryable {
  query<Result>(
    sql: string,
    params?: unknown[]
  ): Promise<{
    rows: Result[]
  }>
}

interface WorkspaceMemberRecord {
  id: string
  role: string
  userId: string
  workspaceId: string
}

interface WorkspaceInvitationRecord {
  code: string
  email: string
  expiresAt: Date
  id: string
  role: WorkspaceRole | null
  status: string
  workspaceId: string
}

const createWorkspaceRepository = (database: Queryable) => {
  const listMemberships = async (
    userId: string
  ): Promise<WorkspaceMembership[]> => {
    const result = await database.query<WorkspaceMembership>(
      `SELECT
         organization.id AS id,
         organization.logo AS logo,
         organization.name AS name,
         member.role AS role,
         organization.slug AS slug
       FROM "auth"."member" AS member
       INNER JOIN "auth"."organization" AS organization
         ON organization.id = member.organization_id
       WHERE member.user_id = $1
       ORDER BY organization.created_at ASC, organization.name ASC`,
      [userId]
    )

    return result.rows
  }

  const listPendingInvites = async (
    email: string
  ): Promise<PendingWorkspaceInvite[]> => {
    const result = await database.query<{
      email: string
      expiresAt: Date
      id: string
      role: string | null
      status: string
      workspaceId: string
      workspaceName: string
      workspaceSlug: string
    }>(
      `SELECT
         invitation.email AS email,
         invitation.expires_at AS "expiresAt",
         invitation.id AS id,
         invitation.role AS role,
         invitation.status AS status,
         organization.id AS "workspaceId",
         organization.name AS "workspaceName",
         organization.slug AS "workspaceSlug"
       FROM "auth"."invitation" AS invitation
       INNER JOIN "auth"."organization" AS organization
         ON organization.id = invitation.organization_id
       WHERE LOWER(invitation.email) = LOWER($1)
         AND invitation.status = 'pending'
       ORDER BY invitation.created_at DESC`,
      [email]
    )

    return result.rows.map((invite) => ({
      ...invite,
      expiresAt: invite.expiresAt.toISOString(),
    }))
  }

  const findInvitationByCode = async (
    code: string
  ): Promise<WorkspaceInvitationRecord | null> => {
    const result = await database.query<WorkspaceInvitationRecord>(
      `SELECT
         invitation.code AS code,
         invitation.email AS email,
         invitation.expires_at AS "expiresAt",
         invitation.id AS id,
         invitation.role AS role,
         invitation.status AS status,
         invitation.organization_id AS "workspaceId"
       FROM "auth"."invitation" AS invitation
       WHERE invitation.code = $1`,
      [code]
    )

    return result.rows.at(0) ?? null
  }

  const findInvitationById = async (
    invitationId: string
  ): Promise<WorkspaceInvitationRecord | null> => {
    const result = await database.query<WorkspaceInvitationRecord>(
      `SELECT
         invitation.code AS code,
         invitation.email AS email,
         invitation.expires_at AS "expiresAt",
         invitation.id AS id,
         invitation.role AS role,
         invitation.status AS status,
         invitation.organization_id AS "workspaceId"
       FROM "auth"."invitation" AS invitation
       WHERE invitation.id = $1`,
      [invitationId]
    )

    return result.rows.at(0) ?? null
  }

  const findMembershipById = async (
    memberId: string
  ): Promise<WorkspaceMemberRecord | null> => {
    const result = await database.query<WorkspaceMemberRecord>(
      `SELECT
         member.id AS id,
         member.role AS role,
         member.user_id AS "userId",
         member.organization_id AS "workspaceId"
       FROM "auth"."member" AS member
       WHERE member.id = $1`,
      [memberId]
    )

    return result.rows.at(0) ?? null
  }

  const findMembershipByUserAndWorkspace = async (
    userId: string,
    workspaceId: string
  ): Promise<WorkspaceMemberRecord | null> => {
    const result = await database.query<WorkspaceMemberRecord>(
      `SELECT
         member.id AS id,
         member.role AS role,
         member.user_id AS "userId",
         member.organization_id AS "workspaceId"
       FROM "auth"."member" AS member
       WHERE member.user_id = $1
         AND member.organization_id = $2`,
      [userId, workspaceId]
    )

    return result.rows.at(0) ?? null
  }

  const setActiveWorkspace = async (
    sessionToken: string,
    workspaceId: string | null
  ) => {
    await database.query(
      `UPDATE "auth"."session"
       SET "active_organization_id" = $2
       WHERE "token" = $1`,
      [sessionToken, workspaceId]
    )
  }

  const workspaceSlugExists = async (slug: string): Promise<boolean> => {
    const result = await database.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM "auth"."organization"
         WHERE slug = $1
       ) AS exists`,
      [slug]
    )

    return result.rows.at(0)?.exists ?? false
  }

  return {
    findInvitationByCode,
    findInvitationById,
    findMembershipById,
    findMembershipByUserAndWorkspace,
    listMemberships,
    listPendingInvites,
    setActiveWorkspace,
    workspaceSlugExists,
  }
}

export { createWorkspaceRepository }
