/* oxlint-disable import/no-relative-parent-imports */

import { randomUUID } from "node:crypto"
import { setTimeout as delay } from "node:timers/promises"

import { createPgPool } from "@workspace/db"

import {
  buildWorkspaceInviteAcceptUrl,
  createWorkspaceInviteCode,
} from "../../../auth/src/domains/identity/authentication/infra/workspace-invite-token"
import { waitForCapturedEmail } from "./email-capture"

interface E2eSeedHelpersOptions {
  authBaseUrl: string
  authSecret: string
  defaultPassword: string
  emailCaptureDir: string
  webBaseUrl: string
}

interface UserSeed {
  email: string
  name: string
  password: string
  userId: string
}

interface WorkspaceSeed {
  name: string
  organizationId: string
  slug: string
}

const describeFailedResponse = async (response: Response) => {
  const responseBody = await response.text()
  const body = responseBody.trim()
  const contentType = response.headers.get("content-type") ?? "unknown"
  const responseSummary = `${response.status} ${response.statusText}`.trim()

  if (body.length === 0) {
    return `${responseSummary} [content-type: ${contentType}]`
  }

  const compactBody = body.replaceAll(/\s+/gu, " ").slice(0, 500)

  return `${responseSummary} [content-type: ${contentType}] ${compactBody}`
}

const createE2eSeedHelpers = ({
  authBaseUrl,
  authSecret,
  defaultPassword,
  emailCaptureDir,
  webBaseUrl,
}: E2eSeedHelpersOptions) => {
  const pool = createPgPool()
  const webOrigin = new URL(webBaseUrl).origin

  const postJson = async (
    path: string,
    body: Record<string, unknown>
  ): Promise<Response> =>
    await fetch(new URL(path, authBaseUrl), {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        origin: webOrigin,
      },
      method: "POST",
    })

  const resetDatabase = async () => {
    await pool.query(
      'TRUNCATE TABLE "auth"."session", "auth"."account", "auth"."verification", "auth"."member", "auth"."invitation", "auth"."organization", "auth"."user" RESTART IDENTITY CASCADE'
    )
  }

  const findUserByEmail = async (email: string) => {
    const result = await pool.query<{ id: string; name: string }>(
      `SELECT id, name
       FROM "auth"."user"
       WHERE email = $1`,
      [email]
    )

    return result.rows.at(0) ?? null
  }

  const createUser = async ({
    email,
    name,
    password = defaultPassword,
    verified = true,
  }: {
    email: string
    name: string
    password?: string
    verified?: boolean
  }): Promise<UserSeed> => {
    const signUpResponse = await postJson("/api/auth/sign-up/email", {
      callbackURL: new URL("/login", webBaseUrl).toString(),
      email,
      name,
      password,
    })

    if (!signUpResponse.ok) {
      throw new Error(
        `Failed to create seed user ${email}: ${await describeFailedResponse(signUpResponse)}`
      )
    }

    if (verified) {
      const verificationEmail = await waitForCapturedEmail<{
        code: string
        to: string
      }>({
        directory: emailCaptureDir,
        predicate: (candidate) =>
          candidate.type === "signup-verification-otp" &&
          candidate.payload.to === email,
      })

      if (!verificationEmail) {
        throw new Error(`Missing signup verification OTP for ${email}.`)
      }

      const verifyResponse = await postJson(
        "/api/auth/email-otp/verify-email",
        {
          email,
          otp: verificationEmail.payload.code,
        }
      )

      if (!verifyResponse.ok) {
        throw new Error(
          `Failed to verify seed user ${email}: ${await describeFailedResponse(verifyResponse)}`
        )
      }
    }

    const user = await findUserByEmail(email)

    if (!user) {
      throw new Error(`Expected seed user ${email} to exist.`)
    }

    return {
      email,
      name,
      password,
      userId: user.id,
    }
  }

  const createWorkspace = async ({
    name,
    ownerUserId,
    role = "owner",
    slug = name
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-|-$/g, ""),
  }: {
    name: string
    ownerUserId: string
    role?: "owner" | "admin" | "dispatcher" | "field_worker"
    slug?: string
  }): Promise<WorkspaceSeed> => {
    const organizationId = randomUUID()

    await pool.query(
      `INSERT INTO "auth"."organization" ("id", "name", "slug", "created_at")
       VALUES ($1, $2, $3, NOW())`,
      [organizationId, name, slug]
    )
    await pool.query(
      `INSERT INTO "auth"."member" ("id", "organization_id", "role", "user_id", "created_at")
       VALUES ($1, $2, $3, $4, NOW())`,
      [randomUUID(), organizationId, role, ownerUserId]
    )

    return {
      name,
      organizationId,
      slug,
    }
  }

  const addWorkspaceMember = async ({
    organizationId,
    role,
    userId,
  }: {
    organizationId: string
    role: "owner" | "admin" | "dispatcher" | "field_worker"
    userId: string
  }) => {
    await pool.query(
      `INSERT INTO "auth"."member" ("id", "organization_id", "role", "user_id", "created_at")
       VALUES ($1, $2, $3, $4, NOW())`,
      [randomUUID(), organizationId, role, userId]
    )
  }

  const createWorkspaceUser = async ({
    email,
    name,
    password = defaultPassword,
    role = "owner",
    workspaceName,
    workspaceSlug,
  }: {
    email: string
    name: string
    password?: string
    role?: "owner" | "admin" | "dispatcher" | "field_worker"
    workspaceName: string
    workspaceSlug?: string
  }) => {
    const user = await createUser({
      email,
      name,
      password,
      verified: true,
    })
    const workspace = await createWorkspace({
      name: workspaceName,
      ownerUserId: user.userId,
      role,
      slug: workspaceSlug,
    })

    return {
      ...user,
      workspaceId: workspace.organizationId,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
    }
  }

  const createPendingInvite = async ({
    email,
    inviterUserId,
    role,
    workspaceId,
  }: {
    email: string
    inviterUserId: string
    role: "owner" | "admin" | "dispatcher" | "field_worker"
    workspaceId: string
  }) => {
    const code = createWorkspaceInviteCode()
    const invitationId = randomUUID()

    await pool.query(
      `INSERT INTO "auth"."invitation" (
         "id",
         "code",
         "email",
         "expires_at",
         "inviter_id",
         "organization_id",
         "role",
         "status",
         "created_at"
       )
       VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, $5, $6, 'pending', NOW())`,
      [invitationId, code, email, inviterUserId, workspaceId, role]
    )

    return {
      acceptUrl: buildWorkspaceInviteAcceptUrl({
        code,
        secret: authSecret,
        webBaseUrl,
      }),
      code,
      invitationId,
    }
  }

  const readMembershipRole = async ({
    organizationId,
    userId,
  }: {
    organizationId: string
    userId: string
  }) => {
    const result = await pool.query<{ role: string }>(
      `SELECT role
       FROM "auth"."member"
       WHERE "organization_id" = $1 AND "user_id" = $2`,
      [organizationId, userId]
    )

    return result.rows.at(0)?.role ?? null
  }

  const waitForMembershipRemoval = async ({
    organizationId,
    userId,
    timeoutMs = 10_000,
  }: {
    organizationId: string
    timeoutMs?: number
    userId: string
  }) => {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      const role = await readMembershipRole({
        organizationId,
        userId,
      })

      if (!role) {
        return
      }

      await delay(250)
    }

    throw new Error("Timed out waiting for the workspace member to be removed.")
  }

  const close = async () => {
    await pool.end()
  }

  return {
    addWorkspaceMember,
    close,
    createPendingInvite,
    createUser,
    createWorkspace,
    createWorkspaceUser,
    readMembershipRole,
    resetDatabase,
    waitForMembershipRemoval,
  }
}

export { createE2eSeedHelpers }
