import type {
  AccountProfile,
  PendingWorkspaceInvite,
  WorkspaceProfile,
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

interface WorkspaceSettingsInviteRecord {
  code: string
  email: string
  id: string
  role: WorkspaceRole
  status: string
  workspaceId: string
}

interface WorkspaceSettingsInviteQueryRecord {
  code: string
  email: string
  id: string
  role: WorkspaceRole | null
  status: string
  workspaceId: string
}

interface WorkspaceSettingsMemberRecord {
  email: string
  id: string
  image: string | null
  name: string
  role: WorkspaceRole
  userId: string
}

const createWorkspaceRepository = (database: Queryable) => {
  const getAccountProfile = async (
    userId: string
  ): Promise<AccountProfile | null> => {
    const result = await database.query<AccountProfile>(
      `SELECT
         "email" AS email,
         "id" AS id,
         "image" AS image,
         "name" AS name
       FROM "auth"."user"
       WHERE "id" = $1`,
      [userId]
    )

    return result.rows.at(0) ?? null
  }

  const updateAccountProfile = async (
    userId: string,
    input: {
      image: string | null
      name: string
    }
  ): Promise<AccountProfile | null> => {
    const result = await database.query<AccountProfile>(
      `UPDATE "auth"."user"
       SET "image" = $2,
           "name" = $3,
           "updated_at" = NOW()
       WHERE "id" = $1
       RETURNING
         "email" AS email,
         "id" AS id,
         "image" AS image,
         "name" AS name`,
      [userId, input.image, input.name]
    )

    return result.rows.at(0) ?? null
  }

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
      role: WorkspaceRole | null
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

  const findWorkspaceProfile = async (
    workspaceId: string
  ): Promise<WorkspaceProfile | null> => {
    const result = await database.query<WorkspaceProfile>(
      `SELECT
         "id" AS id,
         "logo" AS logo,
         "name" AS name,
         "slug" AS slug
       FROM "auth"."organization"
       WHERE "id" = $1`,
      [workspaceId]
    )

    return result.rows.at(0) ?? null
  }

  const updateWorkspaceProfile = async (
    workspaceId: string,
    input: {
      logo: string | null
      name: string
    }
  ): Promise<WorkspaceProfile | null> => {
    const result = await database.query<WorkspaceProfile>(
      `UPDATE "auth"."organization"
       SET "logo" = $2,
           "name" = $3
       WHERE "id" = $1
       RETURNING
         "id" AS id,
         "logo" AS logo,
         "name" AS name,
         "slug" AS slug`,
      [workspaceId, input.logo, input.name]
    )

    return result.rows.at(0) ?? null
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

  const listWorkspacePendingInvites = async (
    workspaceId: string
  ): Promise<WorkspaceSettingsInviteRecord[]> => {
    const result = await database.query<WorkspaceSettingsInviteQueryRecord>(
      `SELECT
         invitation.code AS code,
         invitation.email AS email,
         invitation.id AS id,
         invitation.role AS role,
         invitation.status AS status,
         invitation.organization_id AS "workspaceId"
       FROM "auth"."invitation" AS invitation
       WHERE invitation.organization_id = $1
         AND invitation.status = 'pending'
       ORDER BY invitation.created_at DESC`,
      [workspaceId]
    )

    return result.rows.filter(
      (invite): invite is WorkspaceSettingsInviteRecord => invite.role !== null
    )
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

  const listWorkspaceMembers = async (
    workspaceId: string
  ): Promise<WorkspaceSettingsMemberRecord[]> => {
    const result = await database.query<WorkspaceSettingsMemberRecord>(
      `SELECT
         "auth"."user"."email" AS email,
         member.id AS id,
         "auth"."user"."image" AS image,
         "auth"."user"."name" AS name,
         member.role AS role,
         "auth"."user"."id" AS "userId"
       FROM "auth"."member" AS member
       INNER JOIN "auth"."user"
         ON "auth"."user"."id" = member.user_id
       WHERE member.organization_id = $1
       ORDER BY member.created_at ASC, "auth"."user"."name" ASC`,
      [workspaceId]
    )

    return result.rows
  }

  const countWorkspaceOwners = async (workspaceId: string): Promise<number> => {
    const result = await database.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM "auth"."member"
       WHERE "organization_id" = $1
         AND "role" = 'owner'`,
      [workspaceId]
    )

    return Number(result.rows.at(0)?.count ?? "0")
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
    countWorkspaceOwners,
    findInvitationByCode,
    findInvitationById,
    findMembershipById,
    findMembershipByUserAndWorkspace,
    findWorkspaceProfile,
    getAccountProfile,
    listMemberships,
    listPendingInvites,
    listWorkspaceMembers,
    listWorkspacePendingInvites,
    setActiveWorkspace,
    updateAccountProfile,
    updateWorkspaceProfile,
    workspaceSlugExists,
  }
}

export { createWorkspaceRepository }
