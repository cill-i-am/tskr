/* eslint-disable @typescript-eslint/consistent-type-imports */

import { createPgPool } from "@workspace/db"

import type { WorkspaceBootstrap } from "./domains/workspaces/contracts.js"

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
}))

vi.mock<
  typeof import("./domains/identity/authentication/infra/email-service.js")
>(import("./domains/identity/authentication/infra/email-service.js"), () => ({
  createAuthenticationEmailService: () => ({
    sendEmailVerificationEmail: sendEmailVerificationEmailMock,
    sendExistingUserSignupNotice: sendExistingUserSignupNoticeMock,
    sendPasswordResetEmail: sendPasswordResetEmailMock,
    sendSignupVerificationOtpEmail: sendSignupVerificationOtpEmailMock,
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

const resetEmailMocks = () => {
  sendEmailVerificationEmailMock.mockClear()
  sendExistingUserSignupNoticeMock.mockClear()
  sendPasswordResetEmailMock.mockClear()
  sendSignupVerificationOtpEmailMock.mockClear()
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

const requireValue = <Value>(
  value: Value | null | undefined,
  message: string
): Value => {
  if (value === null || value === undefined) {
    throw new Error(message)
  }

  return value
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

describe("workspace routes", () => {
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

  it("sets the active workspace for a current membership and rejects non-members", async () => {
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
  })
})
