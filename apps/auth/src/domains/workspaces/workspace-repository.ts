import type {
  PendingWorkspaceInvite,
  WorkspaceMembership,
} from "./contracts.js"

interface Queryable {
  query<Result>(
    sql: string,
    params?: unknown[]
  ): Promise<{
    rows: Result[]
  }>
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
    listMemberships,
    listPendingInvites,
    setActiveWorkspace,
    workspaceSlugExists,
  }
}

export { createWorkspaceRepository }
