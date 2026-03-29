/* eslint-disable @typescript-eslint/consistent-type-imports */

import { createPgPool } from "@workspace/db"

import type {
  AccountProfile,
  WorkspaceBootstrap,
  WorkspaceSettingsSnapshot,
} from "./domains/workspaces/contracts.js"
import { requireValue } from "./test-helpers.js"

const getSetCookieValues = (headers: Headers) => {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie()
  }

  const setCookie = headers.get("set-cookie")

  return setCookie ? [setCookie] : []
}

const {
  sendEmailVerificationEmailMock,
  sendExistingUserSignupNoticeMock,
  sendPasswordResetEmailMock,
  sendSignupVerificationOtpEmailMock,
  sendWorkspaceInvitationEmailMock,
} = vi.hoisted(() => ({
  sendEmailVerificationEmailMock: vi.fn().mockResolvedValue({
    id: "test-verification-id",
  }),
  sendExistingUserSignupNoticeMock: vi.fn().mockResolvedValue({
    id: "test-existing-user-id",
  }),
  sendPasswordResetEmailMock: vi.fn().mockResolvedValue({
    id: "test-password-reset-id",
  }),
  sendSignupVerificationOtpEmailMock: vi.fn().mockResolvedValue({
    id: "test-signup-otp-id",
  }),
  sendWorkspaceInvitationEmailMock: vi.fn().mockResolvedValue({
    id: "test-workspace-invite-id",
  }),
}))

vi.mock<
  typeof import("./domains/identity/authentication/infra/email-service.js")
>(import("./domains/identity/authentication/infra/email-service.js"), () => ({
  createAuthenticationEmailService: () => ({
    sendEmailVerificationEmail: sendEmailVerificationEmailMock,
    sendExistingUserSignupNotice: sendExistingUserSignupNoticeMock,
    sendPasswordResetEmail: sendPasswordResetEmailMock,
    sendSignupVerificationOtpEmail: sendSignupVerificationOtpEmailMock,
    sendWorkspaceInvitationEmail: sendWorkspaceInvitationEmailMock,
  }),
}))

process.env.BETTER_AUTH_SECRET ??=
  "test-secret-test-secret-test-secret-test-secret"
process.env.BETTER_AUTH_URL ??= "http://localhost:3002"
process.env.BETTER_AUTH_TRUSTED_ORIGINS ??= "http://localhost:3000"
process.env.EMAIL_FROM ??= "TSKR <noreply@tskr.app>"
process.env.EMAIL_PROVIDER ??= "console"
process.env.WEB_BASE_URL ??= "http://localhost:3000"

const { app } = await import("./app.js")
const { auth } = await import("./auth.js")

const pool = createPgPool()

class CookieJar {
  private readonly cookies = new Map<string, string>()

  addFromResponse(response: Response) {
    for (const setCookie of getSetCookieValues(response.headers)) {
      const [cookiePart] = setCookie.split(";")

      if (!cookiePart) {
        continue
      }

      const separatorIndex = cookiePart.indexOf("=")

      if (separatorIndex === -1) {
        continue
      }

      const name = cookiePart.slice(0, separatorIndex)
      const value = cookiePart.slice(separatorIndex + 1)

      this.cookies.set(name, value)
    }
  }

  get header() {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ")
  }
}

const latestSignupVerificationOtpEmail = () =>
  sendSignupVerificationOtpEmailMock.mock.calls.at(-1)?.at(0) as
    | {
        code: string
        to: string
      }
    | undefined

const latestWorkspaceInvitationEmail = () =>
  sendWorkspaceInvitationEmailMock.mock.calls.at(-1)?.at(0) as
    | {
        acceptUrl: string
        code: string
        invitedByName: string
        role: string
        to: string
        workspaceName: string
      }
    | undefined

const resetEmailMocks = () => {
  sendEmailVerificationEmailMock.mockClear()
  sendExistingUserSignupNoticeMock.mockClear()
  sendPasswordResetEmailMock.mockClear()
  sendSignupVerificationOtpEmailMock.mockClear()
  sendWorkspaceInvitationEmailMock.mockClear()
}

const truncateAuthTables = async () => {
  try {
    await pool.query(
      'TRUNCATE TABLE "auth"."session", "auth"."account", "auth"."verification", "auth"."member", "auth"."invitation", "auth"."organization", "auth"."user" RESTART IDENTITY CASCADE'
    )
  } catch (error) {
    const databaseError = error as { code?: string }

    if (databaseError.code !== "42P01") {
      throw error
    }
  }
}

const resetWorkspaceTestState = async () => {
  resetEmailMocks()
  await truncateAuthTables()
}

const requestJson = async <Json>(
  path: string,
  init?: RequestInit,
  cookieJar?: CookieJar
): Promise<{
  json: Json | null
  response: Response
}> => {
  const headers = new Headers(init?.headers)

  if (cookieJar?.header) {
    headers.set("cookie", cookieJar.header)
  }

  const response = await app.request(path, {
    ...init,
    headers,
  })

  cookieJar?.addFromResponse(response)

  return {
    json: response.headers.get("content-type")?.includes("application/json")
      ? ((await response.json()) as Json)
      : null,
    response,
  }
}

const getCurrentSession = (cookieJar: CookieJar) =>
  auth.api.getSession({
    headers: new Headers({
      cookie: cookieJar.header,
    }),
  })

const signUpAndVerifyEmail = async (email: string, name: string) => {
  const cookieJar = new CookieJar()

  const signUpResponse = await requestJson(
    "/api/auth/sign-up/email",
    {
      body: JSON.stringify({
        callbackURL: "http://localhost:3000/login",
        email,
        name,
        password: "password-1234",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
    cookieJar
  )

  expect(signUpResponse.response.status).toBe(200)

  const verificationOtpEmailInput = requireValue(
    latestSignupVerificationOtpEmail(),
    "Expected a signup verification OTP email"
  )

  const verifyEmailResponse = await requestJson(
    "/api/auth/email-otp/verify-email",
    {
      body: JSON.stringify({
        email,
        otp: verificationOtpEmailInput.code,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
    cookieJar
  )

  expect(verifyEmailResponse.response.status).toBe(200)

  const session = requireValue(
    await getCurrentSession(cookieJar),
    "Expected an authenticated Better Auth session"
  )

  return {
    cookieJar,
    session,
  }
}

const insertOrganization = async (name: string, slug: string) => {
  const id = crypto.randomUUID()

  await pool.query(
    `INSERT INTO "auth"."organization" ("id", "name", "slug", "created_at")
     VALUES ($1, $2, $3, NOW())`,
    [id, name, slug]
  )

  return { id, name, slug }
}

const insertPendingInvitation = async ({
  email,
  inviterId,
  organizationId,
  role,
}: {
  email: string
  inviterId: string
  organizationId: string
  role: string
}) => {
  const id = crypto.randomUUID()
  const code = `code-${crypto.randomUUID()}`

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
    [id, code, email, inviterId, organizationId, role]
  )

  return { id }
}

const setSessionActiveWorkspace = async (
  sessionToken: string,
  organizationId: string | null
) => {
  await pool.query(
    `UPDATE "auth"."session"
     SET "active_organization_id" = $2
     WHERE "token" = $1`,
    [sessionToken, organizationId]
  )
}

const insertMember = async ({
  organizationId,
  role,
  userId,
}: {
  organizationId: string
  role: string
  userId: string
}) => {
  const id = crypto.randomUUID()

  await pool.query(
    `INSERT INTO "auth"."member" ("id", "organization_id", "role", "user_id", "created_at")
     VALUES ($1, $2, $3, $4, NOW())`,
    [id, organizationId, role, userId]
  )

  return {
    id,
    organizationId,
    role,
    userId,
  }
}

const findInvitationById = async (invitationId: string) => {
  const result = await pool.query<{
    code: string
    email: string
    id: string
    organizationId: string
    role: string | null
    status: string
  }>(
    `SELECT
       "code" AS code,
       "email" AS email,
       "id" AS id,
       "organization_id" AS "organizationId",
       "role" AS role,
       "status" AS status
     FROM "auth"."invitation"
     WHERE "id" = $1`,
    [invitationId]
  )

  return result.rows.at(0) ?? null
}

const findMembership = async (memberId: string) => {
  const result = await pool.query<{
    id: string
    organizationId: string
    role: string
    userId: string
  }>(
    `SELECT
       "id" AS id,
       "organization_id" AS "organizationId",
       "role" AS role,
       "user_id" AS "userId"
     FROM "auth"."member"
     WHERE "id" = $1`,
    [memberId]
  )

  return result.rows.at(0) ?? null
}

const findMembershipByUserAndWorkspace = async (
  userId: string,
  organizationId: string
) => {
  const result = await pool.query<{
    id: string
    organizationId: string
    role: string
    userId: string
  }>(
    `SELECT
       "id" AS id,
       "organization_id" AS "organizationId",
       "role" AS role,
       "user_id" AS "userId"
     FROM "auth"."member"
     WHERE "user_id" = $1
       AND "organization_id" = $2`,
    [userId, organizationId]
  )

  return result.rows.at(0) ?? null
}

describe("workspace routes", () => {
  it("returns the authenticated account profile", async () => {
    await resetWorkspaceTestState()

    const { cookieJar, session } = await signUpAndVerifyEmail(
      "ada@example.com",
      "Ada Lovelace"
    )

    const response = await requestJson<AccountProfile>(
      "/api/account/profile",
      {
        method: "GET",
      },
      cookieJar
    )

    expect(response.response.status).toBe(200)
    expect(response.json).toStrictEqual({
      email: "ada@example.com",
      id: session.user.id,
      image: null,
      name: "Ada Lovelace",
    })
  })

  it("updates the authenticated account profile and rejects unauthenticated access", async () => {
    await resetWorkspaceTestState()

    const { cookieJar, session } = await signUpAndVerifyEmail(
      "ada@example.com",
      "Ada Lovelace"
    )

    const unauthenticatedResponse = await requestJson("/api/account/profile", {
      method: "GET",
    })

    expect(unauthenticatedResponse.response.status).toBe(401)

    const updateResponse = await requestJson<AccountProfile>(
      "/api/account/profile",
      {
        body: JSON.stringify({
          image: "https://cdn.example.com/ada.png",
          name: "Ada Byron",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      },
      cookieJar
    )

    expect(updateResponse.response.status).toBe(200)
    expect(updateResponse.json).toStrictEqual({
      email: "ada@example.com",
      id: session.user.id,
      image: "https://cdn.example.com/ada.png",
      name: "Ada Byron",
    })

    const refreshedProfileResponse = await requestJson<AccountProfile>(
      "/api/account/profile",
      {
        method: "GET",
      },
      cookieJar
    )

    expect(refreshedProfileResponse.response.status).toBe(200)
    expect(refreshedProfileResponse.json).toStrictEqual(updateResponse.json)
  })

  it("creates a workspace, derives the slug, assigns owner membership, and returns bootstrap", async () => {
    await resetWorkspaceTestState()

    const { cookieJar } = await signUpAndVerifyEmail(
      "ada@example.com",
      "Ada Lovelace"
    )

    const response = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      cookieJar
    )

    expect(response.response.status).toBe(200)
    expect(response.json).toMatchObject({
      activeWorkspace: {
        name: "Ops Control",
        role: "owner",
        slug: "ops-control",
      },
      memberships: [
        {
          name: "Ops Control",
          role: "owner",
          slug: "ops-control",
        },
      ],
      pendingInvites: [],
      recoveryState: "active_valid",
    })
  })

  it("retries workspace slug derivation when the base slug already exists", async () => {
    await resetWorkspaceTestState()

    const { cookieJar } = await signUpAndVerifyEmail(
      "ada@example.com",
      "Ada Lovelace"
    )

    await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      cookieJar
    )

    const secondResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      cookieJar
    )

    expect(secondResponse.response.status).toBe(200)
    expect(secondResponse.json).toMatchObject({
      activeWorkspace: {
        slug: "ops-control-2",
      },
      memberships: expect.arrayContaining([
        expect.objectContaining({ slug: "ops-control" }),
        expect.objectContaining({ slug: "ops-control-2" }),
      ]),
    })
  })

  it("auto-switches bootstrap when the stored active workspace is invalid and one membership remains", async () => {
    await resetWorkspaceTestState()

    const { cookieJar, session } = await signUpAndVerifyEmail(
      "ada@example.com",
      "Ada Lovelace"
    )

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      cookieJar
    )
    const createdActiveWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    const unrelatedOrganization = await insertOrganization(
      "Elsewhere",
      "elsewhere"
    )

    await setSessionActiveWorkspace(
      session.session.token,
      unrelatedOrganization.id
    )

    const bootstrapResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces/bootstrap",
      {
        method: "GET",
      },
      cookieJar
    )

    expect(bootstrapResponse.response.status).toBe(200)
    expect(bootstrapResponse.json).toMatchObject({
      activeWorkspace: {
        id: createdActiveWorkspace.id,
        slug: "ops-control",
      },
      recoveryState: "auto_switched",
    })
  })

  it("clears bootstrap state when the stored active workspace is invalid and several memberships remain", async () => {
    await resetWorkspaceTestState()

    const { cookieJar, session } = await signUpAndVerifyEmail(
      "ada@example.com",
      "Ada Lovelace"
    )

    await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      cookieJar
    )

    await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Field Team",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      cookieJar
    )

    const unrelatedOrganization = await insertOrganization(
      "Elsewhere",
      "elsewhere"
    )

    await setSessionActiveWorkspace(
      session.session.token,
      unrelatedOrganization.id
    )

    const bootstrapResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces/bootstrap",
      {
        method: "GET",
      },
      cookieJar
    )

    expect(bootstrapResponse.response.status).toBe(200)
    expect(bootstrapResponse.json).toMatchObject({
      activeWorkspace: null,
      recoveryState: "selection_required",
    })
    expect(bootstrapResponse.json?.memberships).toHaveLength(2)
  })

  it("requires onboarding when no memberships remain", async () => {
    await resetWorkspaceTestState()

    const { cookieJar, session } = await signUpAndVerifyEmail(
      "ada@example.com",
      "Ada Lovelace"
    )

    const unrelatedOrganization = await insertOrganization(
      "Elsewhere",
      "elsewhere"
    )

    await setSessionActiveWorkspace(
      session.session.token,
      unrelatedOrganization.id
    )

    const bootstrapResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces/bootstrap",
      {
        method: "GET",
      },
      cookieJar
    )

    expect(bootstrapResponse.response.status).toBe(200)
    expect(bootstrapResponse.json).toStrictEqual({
      activeWorkspace: null,
      memberships: [],
      pendingInvites: [],
      recoveryState: "onboarding_required",
    })
  })

  it("includes pending invites in bootstrap", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner")
    const invitedUser = await signUpAndVerifyEmail(
      "ada@example.com",
      "Ada Lovelace"
    )

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const createdActiveWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the owner workspace response to include an active workspace"
    )

    await insertPendingInvitation({
      email: "ada@example.com",
      inviterId: owner.session.user.id,
      organizationId: createdActiveWorkspace.id,
      role: "dispatcher",
    })

    const bootstrapResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces/bootstrap",
      {
        method: "GET",
      },
      invitedUser.cookieJar
    )

    expect(bootstrapResponse.response.status).toBe(200)
    expect(bootstrapResponse.json).toMatchObject({
      activeWorkspace: null,
      memberships: [],
      pendingInvites: [
        {
          email: "ada@example.com",
          role: "dispatcher",
          status: "pending",
          workspaceName: "Ops Control",
          workspaceSlug: "ops-control",
        },
      ],
      recoveryState: "onboarding_required",
    })
  })

  it("selects a valid membership from selection_required bootstrap", async () => {
    await resetWorkspaceTestState()

    const { cookieJar, session } = await signUpAndVerifyEmail(
      "ada@example.com",
      "Ada Lovelace"
    )

    await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      cookieJar
    )

    const secondWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Field Team",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      cookieJar
    )
    const secondActiveWorkspace = requireValue(
      secondWorkspaceResponse.json?.activeWorkspace,
      "Expected the second workspace response to include an active workspace"
    )

    const unrelatedOrganization = await insertOrganization(
      "Elsewhere",
      "elsewhere"
    )

    await setSessionActiveWorkspace(
      session.session.token,
      unrelatedOrganization.id
    )

    const selectionRequiredBootstrap = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces/bootstrap",
      {
        method: "GET",
      },
      cookieJar
    )

    expect({
      json: selectionRequiredBootstrap.json,
      status: selectionRequiredBootstrap.response.status,
    }).toMatchObject({
      json: {
        activeWorkspace: null,
        recoveryState: "selection_required",
      },
      status: 200,
    })

    const setActiveResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces/active",
      {
        body: JSON.stringify({
          workspaceId: secondActiveWorkspace.id,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PUT",
      },
      cookieJar
    )

    expect(setActiveResponse.response.status).toBe(200)
    expect(setActiveResponse.json).toMatchObject({
      activeWorkspace: {
        id: secondActiveWorkspace.id,
        slug: "field-team",
      },
      recoveryState: "active_valid",
    })

    const persistedBootstrap = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces/bootstrap",
      {
        method: "GET",
      },
      cookieJar
    )

    expect(persistedBootstrap.response.status).toBe(200)
    expect(persistedBootstrap.json).toMatchObject({
      activeWorkspace: {
        id: secondActiveWorkspace.id,
        slug: "field-team",
      },
      recoveryState: "active_valid",
    })
  })

  it("rejects non-members when selecting an active workspace", async () => {
    await resetWorkspaceTestState()

    const { cookieJar } = await signUpAndVerifyEmail(
      "ada@example.com",
      "Ada Lovelace"
    )

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    const unrelatedOrganization = await insertOrganization(
      "Elsewhere",
      "elsewhere"
    )

    const forbiddenResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces/active",
      {
        body: JSON.stringify({
          workspaceId: unrelatedOrganization.id,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PUT",
      },
      cookieJar
    )

    expect(forbiddenResponse.response.status).toBe(403)

    const persistedBootstrap = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces/bootstrap",
      {
        method: "GET",
      },
      cookieJar
    )

    expect(persistedBootstrap.response.status).toBe(200)
    expect(persistedBootstrap.json).toMatchObject({
      activeWorkspace: {
        id: activeWorkspace.id,
        slug: "ops-control",
      },
      recoveryState: "active_valid",
    })
  })

  it("lets an owner issue an invite with a code and signed accept link", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    const inviteResponse = await requestJson<{
      acceptUrl: string
      code: string
      email: string
      id: string
      role: string
      status: string
      workspaceId: string
    }>(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "worker@example.com",
          role: "dispatcher",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )

    expect(inviteResponse.response.status).toBe(200)
    expect(inviteResponse.json).toMatchObject({
      acceptUrl: expect.stringContaining("token="),
      code: expect.any(String),
      email: "worker@example.com",
      role: "dispatcher",
      status: "pending",
      workspaceId: activeWorkspace.id,
    })

    const invitationEmail = requireValue(
      latestWorkspaceInvitationEmail(),
      "Expected the latest workspace invitation email"
    )

    expect(invitationEmail).toMatchObject({
      acceptUrl: inviteResponse.json?.acceptUrl,
      code: inviteResponse.json?.code,
      invitedByName: "Owner User",
      role: "dispatcher",
      to: "worker@example.com",
      workspaceName: "Ops Control",
    })
  })

  it("allows admins to invite non-owner roles but forbids owner invites and dispatcher invite management", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")
    const admin = await signUpAndVerifyEmail("admin@example.com", "Admin User")
    const dispatcher = await signUpAndVerifyEmail(
      "dispatcher@example.com",
      "Dispatcher User"
    )

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    await insertMember({
      organizationId: activeWorkspace.id,
      role: "admin",
      userId: admin.session.user.id,
    })
    await insertMember({
      organizationId: activeWorkspace.id,
      role: "dispatcher",
      userId: dispatcher.session.user.id,
    })

    const adminInviteResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "field@example.com",
          role: "field_worker",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      admin.cookieJar
    )

    expect(adminInviteResponse.response.status).toBe(200)

    const forbiddenOwnerInviteResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "coowner@example.com",
          role: "owner",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      admin.cookieJar
    )

    expect(forbiddenOwnerInviteResponse.response.status).toBe(403)

    const dispatcherInviteResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "other@example.com",
          role: "field_worker",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      dispatcher.cookieJar
    )

    expect(dispatcherInviteResponse.response.status).toBe(403)
  })

  it("resends an invite without changing the canonical code", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    const inviteResponse = await requestJson<{
      code: string
      id: string
    }>(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "worker@example.com",
          role: "dispatcher",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )

    sendWorkspaceInvitationEmailMock.mockClear()

    const resendResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/invites/${inviteResponse.json?.id}/resend`,
      {
        method: "POST",
      },
      owner.cookieJar
    )

    expect(resendResponse.response.status).toBe(204)

    const resentInvitation = requireValue(
      await findInvitationById(
        requireValue(inviteResponse.json?.id, "Expected invite id")
      ),
      "Expected invitation to exist after resend"
    )
    const invitationEmail = requireValue(
      latestWorkspaceInvitationEmail(),
      "Expected a resent invitation email"
    )

    expect(resentInvitation.code).toBe(inviteResponse.json?.code)
    expect(invitationEmail.code).toBe(inviteResponse.json?.code)
  })

  it("accepts an invite by code for an existing verified account and switches the active workspace", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")
    const invitedUser = await signUpAndVerifyEmail(
      "worker@example.com",
      "Worker User"
    )

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    const inviteResponse = await requestJson<{
      code: string
      workspaceId: string
    }>(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "worker@example.com",
          role: "dispatcher",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )

    const acceptResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces/invites/accept",
      {
        body: JSON.stringify({
          code: inviteResponse.json?.code,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      invitedUser.cookieJar
    )

    expect(acceptResponse.response.status).toBe(200)
    expect(acceptResponse.json).toMatchObject({
      activeWorkspace: {
        id: activeWorkspace.id,
        role: "dispatcher",
        slug: "ops-control",
      },
      memberships: [
        {
          id: activeWorkspace.id,
          role: "dispatcher",
          slug: "ops-control",
        },
      ],
      pendingInvites: [],
      recoveryState: "active_valid",
    })
  })

  it("accepts an invite by signed token and rejects revoked invites", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")
    const invitedUser = await signUpAndVerifyEmail(
      "worker@example.com",
      "Worker User"
    )

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    const inviteResponse = await requestJson<{
      acceptUrl: string
      code: string
      id: string
    }>(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "worker@example.com",
          role: "dispatcher",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const acceptUrl = new URL(
      requireValue(inviteResponse.json?.acceptUrl, "Expected acceptUrl")
    )

    const tokenAcceptResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces/invites/accept",
      {
        body: JSON.stringify({
          token: acceptUrl.searchParams.get("token"),
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      invitedUser.cookieJar
    )

    expect(tokenAcceptResponse.response.status).toBe(200)

    const secondInvitedUser = await signUpAndVerifyEmail(
      "another@example.com",
      "Another User"
    )
    const secondInviteResponse = await requestJson<{
      code: string
      id: string
    }>(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "another@example.com",
          role: "field_worker",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )

    const revokeResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/invites/${secondInviteResponse.json?.id}`,
      {
        method: "DELETE",
      },
      owner.cookieJar
    )

    expect(revokeResponse.response.status).toBe(204)

    const revokedAcceptResponse = await requestJson(
      "/api/workspaces/invites/accept",
      {
        body: JSON.stringify({
          code: secondInviteResponse.json?.code,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      secondInvitedUser.cookieJar
    )

    expect(revokedAcceptResponse.response.status).toBe(400)
  })

  it("lets an owner change roles but blocks admins from mutating owners", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")
    const admin = await signUpAndVerifyEmail("admin@example.com", "Admin User")
    const worker = await signUpAndVerifyEmail(
      "worker@example.com",
      "Worker User"
    )

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    const adminMembership = await insertMember({
      organizationId: activeWorkspace.id,
      role: "admin",
      userId: admin.session.user.id,
    })
    const workerMembership = await insertMember({
      organizationId: activeWorkspace.id,
      role: "field_worker",
      userId: worker.session.user.id,
    })

    const ownerPromoteResponse = await requestJson<{
      memberId: string
      role: string
      workspaceId: string
    }>(
      `/api/workspaces/${activeWorkspace.id}/members/${workerMembership.id}/role`,
      {
        body: JSON.stringify({
          role: "owner",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      },
      owner.cookieJar
    )

    expect(ownerPromoteResponse.response.status).toBe(200)
    expect(ownerPromoteResponse.json).toMatchObject({
      memberId: workerMembership.id,
      role: "owner",
      workspaceId: activeWorkspace.id,
    })

    const adminDemoteOwnerResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/members/${workerMembership.id}/role`,
      {
        body: JSON.stringify({
          role: "dispatcher",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      },
      admin.cookieJar
    )

    expect(adminDemoteOwnerResponse.response.status).toBe(403)

    const adminRemoveOwnerResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/members/${workerMembership.id}`,
      {
        method: "DELETE",
      },
      admin.cookieJar
    )

    expect(adminRemoveOwnerResponse.response.status).toBe(403)
    await expect(findMembership(adminMembership.id)).resolves.not.toBeNull()
  })

  it("blocks owner self-demotion so ownership mutations stay aligned with the settings contract", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")
    const admin = await signUpAndVerifyEmail("admin@example.com", "Admin User")

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    await insertMember({
      organizationId: activeWorkspace.id,
      role: "admin",
      userId: admin.session.user.id,
    })

    const ownerMembership = requireValue(
      await findMembershipByUserAndWorkspace(
        owner.session.user.id,
        activeWorkspace.id
      ),
      "Expected the owner membership to exist"
    )

    const selfDemotionResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/members/${ownerMembership.id}/role`,
      {
        body: JSON.stringify({
          role: "admin",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      },
      owner.cookieJar
    )

    expect(selfDemotionResponse.response.status).toBe(403)
    await expect(findMembership(ownerMembership.id)).resolves.toMatchObject({
      id: ownerMembership.id,
      role: "owner",
    })
  })

  it("allows self-leave for non-last-owner members and blocks the last owner from leaving", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")
    const admin = await signUpAndVerifyEmail("admin@example.com", "Admin User")

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    const adminMembership = await insertMember({
      organizationId: activeWorkspace.id,
      role: "admin",
      userId: admin.session.user.id,
    })

    const adminLeaveResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/members/${adminMembership.id}`,
      {
        method: "DELETE",
      },
      admin.cookieJar
    )

    expect(adminLeaveResponse.response.status).toBe(204)
    await expect(findMembership(adminMembership.id)).resolves.toBeNull()

    const ownerMembership = requireValue(
      await findMembershipByUserAndWorkspace(
        owner.session.user.id,
        activeWorkspace.id
      ),
      "Expected the owner membership to exist"
    )

    const ownerLeaveResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/members/${ownerMembership.id}`,
      {
        method: "DELETE",
      },
      owner.cookieJar
    )

    expect(ownerLeaveResponse.response.status).toBe(400)
  })

  it("returns the workspace settings snapshot for owners with member and invite actions", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")
    const admin = await signUpAndVerifyEmail("admin@example.com", "Admin User")
    const dispatcher = await signUpAndVerifyEmail(
      "dispatcher@example.com",
      "Dispatcher User"
    )

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    const adminMembership = await insertMember({
      organizationId: activeWorkspace.id,
      role: "admin",
      userId: admin.session.user.id,
    })
    const dispatcherMembership = await insertMember({
      organizationId: activeWorkspace.id,
      role: "dispatcher",
      userId: dispatcher.session.user.id,
    })

    const pendingInvite = await requestJson<{
      id: string
    }>(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "worker@example.com",
          role: "field_worker",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )

    expect(pendingInvite.response.status).toBe(200)

    const settingsResponse = await requestJson<WorkspaceSettingsSnapshot>(
      `/api/workspaces/${activeWorkspace.id}/settings`,
      {
        method: "GET",
      },
      owner.cookieJar
    )

    expect(settingsResponse.response.status).toBe(200)
    expect(settingsResponse.json).toMatchObject({
      accountProfile: {
        email: "owner@example.com",
        id: owner.session.user.id,
        image: null,
        name: "Owner User",
      },
      permissions: {
        canEditWorkspaceProfile: true,
        canInviteRoles: ["owner", "admin", "dispatcher", "field_worker"],
        canManageInvites: true,
        canManageMembers: true,
      },
      viewerRole: "owner",
      workspaceProfile: {
        id: activeWorkspace.id,
        logo: null,
        name: "Ops Control",
        slug: "ops-control",
      },
    })
    expect(settingsResponse.json?.members).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "admin@example.com",
          id: adminMembership.id,
          permissions: {
            assignableRoles: ["owner", "admin", "dispatcher", "field_worker"],
            canChangeRole: true,
            canRemove: true,
          },
          role: "admin",
        }),
        expect.objectContaining({
          email: "dispatcher@example.com",
          id: dispatcherMembership.id,
          permissions: {
            assignableRoles: ["owner", "admin", "dispatcher", "field_worker"],
            canChangeRole: true,
            canRemove: true,
          },
          role: "dispatcher",
        }),
        expect.objectContaining({
          email: "owner@example.com",
          isCurrentUser: true,
          permissions: {
            assignableRoles: [],
            canChangeRole: false,
            canRemove: false,
          },
          role: "owner",
        }),
      ])
    )
    expect(settingsResponse.json?.pendingInvites).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "worker@example.com",
          permissions: {
            canResend: true,
            canRevoke: true,
          },
          role: "field_worker",
          status: "pending",
          workspaceId: activeWorkspace.id,
        }),
      ])
    )
  })

  it("returns the workspace settings snapshot for admins but blocks member-level roles", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")
    const admin = await signUpAndVerifyEmail("admin@example.com", "Admin User")
    const dispatcher = await signUpAndVerifyEmail(
      "dispatcher@example.com",
      "Dispatcher User"
    )

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    await insertMember({
      organizationId: activeWorkspace.id,
      role: "admin",
      userId: admin.session.user.id,
    })
    await insertMember({
      organizationId: activeWorkspace.id,
      role: "dispatcher",
      userId: dispatcher.session.user.id,
    })

    const inviteResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "coowner@example.com",
          role: "owner",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )

    expect(inviteResponse.response.status).toBe(200)

    const adminSettingsResponse = await requestJson<WorkspaceSettingsSnapshot>(
      `/api/workspaces/${activeWorkspace.id}/settings`,
      {
        method: "GET",
      },
      admin.cookieJar
    )

    expect(adminSettingsResponse.response.status).toBe(200)
    expect(adminSettingsResponse.json).toMatchObject({
      permissions: {
        canEditWorkspaceProfile: true,
        canInviteRoles: ["admin", "dispatcher", "field_worker"],
        canManageInvites: true,
        canManageMembers: true,
      },
      viewerRole: "admin",
    })
    expect(adminSettingsResponse.json?.members).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "owner@example.com",
          permissions: {
            assignableRoles: [],
            canChangeRole: false,
            canRemove: false,
          },
          role: "owner",
        }),
        expect.objectContaining({
          email: "dispatcher@example.com",
          permissions: {
            assignableRoles: ["admin", "dispatcher", "field_worker"],
            canChangeRole: true,
            canRemove: true,
          },
          role: "dispatcher",
        }),
      ])
    )
    expect(adminSettingsResponse.json?.pendingInvites).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permissions: {
            canResend: false,
            canRevoke: false,
          },
          role: "owner",
        }),
      ])
    )
  })

  it("rejects workspace settings access for dispatcher and field worker roles", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")
    const dispatcher = await signUpAndVerifyEmail(
      "dispatcher@example.com",
      "Dispatcher User"
    )
    const worker = await signUpAndVerifyEmail(
      "worker@example.com",
      "Worker User"
    )

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    await insertMember({
      organizationId: activeWorkspace.id,
      role: "dispatcher",
      userId: dispatcher.session.user.id,
    })
    await insertMember({
      organizationId: activeWorkspace.id,
      role: "field_worker",
      userId: worker.session.user.id,
    })

    const dispatcherSettingsResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/settings`,
      {
        method: "GET",
      },
      dispatcher.cookieJar
    )

    expect(dispatcherSettingsResponse.response.status).toBe(403)

    const workerSettingsResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/settings`,
      {
        method: "GET",
      },
      worker.cookieJar
    )

    expect(workerSettingsResponse.response.status).toBe(403)
  })

  it("rejects dispatcher and field worker access across workspace admin endpoints", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")
    const dispatcher = await signUpAndVerifyEmail(
      "dispatcher@example.com",
      "Dispatcher User"
    )
    const worker = await signUpAndVerifyEmail(
      "worker@example.com",
      "Worker User"
    )
    const admin = await signUpAndVerifyEmail("admin@example.com", "Admin User")

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    await insertMember({
      organizationId: activeWorkspace.id,
      role: "dispatcher",
      userId: dispatcher.session.user.id,
    })
    await insertMember({
      organizationId: activeWorkspace.id,
      role: "field_worker",
      userId: worker.session.user.id,
    })
    const adminMembership = await insertMember({
      organizationId: activeWorkspace.id,
      role: "admin",
      userId: admin.session.user.id,
    })

    const inviteResponse = await requestJson<{ id: string }>(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "pending@example.com",
          role: "field_worker",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )

    expect(inviteResponse.response.status).toBe(200)

    const dispatcherInviteResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "blocked@example.com",
          role: "field_worker",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      dispatcher.cookieJar
    )
    const dispatcherProfileResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/profile`,
      {
        body: JSON.stringify({
          logo: "https://cdn.example.com/dispatch.png",
          name: "Dispatch Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      },
      dispatcher.cookieJar
    )
    const dispatcherRoleResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/members/${adminMembership.id}/role`,
      {
        body: JSON.stringify({
          role: "dispatcher",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      },
      dispatcher.cookieJar
    )
    const workerRemoveResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/members/${adminMembership.id}`,
      {
        method: "DELETE",
      },
      worker.cookieJar
    )
    const workerRevokeResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/invites/${inviteResponse.json?.id}`,
      {
        method: "DELETE",
      },
      worker.cookieJar
    )

    expect([
      dispatcherInviteResponse.response.status,
      dispatcherProfileResponse.response.status,
      dispatcherRoleResponse.response.status,
      workerRemoveResponse.response.status,
      workerRevokeResponse.response.status,
    ]).toStrictEqual([403, 403, 403, 403, 403])
  })

  it("lets admins revoke non-owner invites but keeps owner invite revocation owner-only", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")
    const admin = await signUpAndVerifyEmail("admin@example.com", "Admin User")

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    await insertMember({
      organizationId: activeWorkspace.id,
      role: "admin",
      userId: admin.session.user.id,
    })

    const adminInviteResponse = await requestJson<{ id: string }>(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "worker@example.com",
          role: "dispatcher",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const ownerInviteResponse = await requestJson<{ id: string }>(
      `/api/workspaces/${activeWorkspace.id}/invites`,
      {
        body: JSON.stringify({
          email: "coowner@example.com",
          role: "owner",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )

    expect(adminInviteResponse.response.status).toBe(200)
    expect(ownerInviteResponse.response.status).toBe(200)

    const adminRevokeDispatcherInviteResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/invites/${adminInviteResponse.json?.id}`,
      {
        method: "DELETE",
      },
      admin.cookieJar
    )
    const adminRevokeOwnerInviteResponse = await requestJson(
      `/api/workspaces/${activeWorkspace.id}/invites/${ownerInviteResponse.json?.id}`,
      {
        method: "DELETE",
      },
      admin.cookieJar
    )

    expect(adminRevokeDispatcherInviteResponse.response.status).toBe(204)
    expect(adminRevokeOwnerInviteResponse.response.status).toBe(403)
    const adminInvite = await findInvitationById(
      requireValue(adminInviteResponse.json?.id, "Expected admin invite id")
    )
    const ownerInvite = await findInvitationById(
      requireValue(ownerInviteResponse.json?.id, "Expected owner invite id")
    )

    expect({
      adminInviteStatus: adminInvite?.status,
      ownerInviteStatus: ownerInvite?.status,
    }).toStrictEqual({
      adminInviteStatus: "canceled",
      ownerInviteStatus: "pending",
    })
  })

  it("updates the workspace profile for owners and keeps the slug stable", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    const updateResponse = await requestJson<
      WorkspaceSettingsSnapshot["workspaceProfile"]
    >(
      `/api/workspaces/${activeWorkspace.id}/profile`,
      {
        body: JSON.stringify({
          logo: "https://cdn.example.com/ops-control.png",
          name: "Ops Control North",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      },
      owner.cookieJar
    )

    expect(updateResponse.response.status).toBe(200)
    expect(updateResponse.json).toStrictEqual({
      id: activeWorkspace.id,
      logo: "https://cdn.example.com/ops-control.png",
      name: "Ops Control North",
      slug: "ops-control",
    })
  })

  it("allows admins to update the workspace profile", async () => {
    await resetWorkspaceTestState()

    const owner = await signUpAndVerifyEmail("owner@example.com", "Owner User")
    const admin = await signUpAndVerifyEmail("admin@example.com", "Admin User")

    const createWorkspaceResponse = await requestJson<WorkspaceBootstrap>(
      "/api/workspaces",
      {
        body: JSON.stringify({
          name: "Ops Control",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      owner.cookieJar
    )
    const activeWorkspace = requireValue(
      createWorkspaceResponse.json?.activeWorkspace,
      "Expected the created workspace response to include an active workspace"
    )

    await insertMember({
      organizationId: activeWorkspace.id,
      role: "admin",
      userId: admin.session.user.id,
    })

    const updateResponse = await requestJson<
      WorkspaceSettingsSnapshot["workspaceProfile"]
    >(
      `/api/workspaces/${activeWorkspace.id}/profile`,
      {
        body: JSON.stringify({
          logo: "https://cdn.example.com/admin-update.png",
          name: "Ops Control Admin",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      },
      admin.cookieJar
    )

    expect(updateResponse.response.status).toBe(200)
    expect(updateResponse.json).toStrictEqual({
      id: activeWorkspace.id,
      logo: "https://cdn.example.com/admin-update.png",
      name: "Ops Control Admin",
      slug: "ops-control",
    })
  })
})
