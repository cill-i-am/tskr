import { hc } from "hono/client"
import { Pool } from "pg"

import type { AppType } from "./app.js"

const {
  sendEmailVerificationEmailMock,
  sendExistingUserSignupNoticeMock,
  sendPasswordResetEmailMock,
} = vi.hoisted(() => ({
  sendEmailVerificationEmailMock: vi.fn(async () => ({
    id: "test-verification-id",
  })),
  sendExistingUserSignupNoticeMock: vi.fn(async () => ({
    id: "test-existing-user-id",
  })),
  sendPasswordResetEmailMock: vi.fn(async () => ({
    id: "test-password-reset-id",
  })),
}))

vi.mock("./domains/identity/authentication/infra/email-service.js", () => ({
  createAuthenticationEmailService: () => ({
    sendEmailVerificationEmail: sendEmailVerificationEmailMock,
    sendExistingUserSignupNotice: sendExistingUserSignupNoticeMock,
    sendPasswordResetEmail: sendPasswordResetEmailMock,
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
const { upResponse } = await import("./domains/system/healthcheck/index.js")

const { DATABASE_URL } = process.env

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL must be set for auth integration tests")
}

const pool = new Pool({
  connectionString: DATABASE_URL,
})

const requestJson = async (path: string, init?: RequestInit) => {
  const response = await app.request(path, init)

  return {
    json: response.headers.get("content-type")?.includes("application/json")
      ? await response.json()
      : null,
    response,
  }
}

const truncateAuthTables = async () => {
  try {
    await pool.query(
      `TRUNCATE TABLE "session", account, verification, "user" RESTART IDENTITY CASCADE`
    )
  } catch (error) {
    const databaseError = error as { code?: string }

    if (databaseError.code !== "42P01") {
      throw error
    }
  }
}

const findLatestResetToken = async () => {
  try {
    const result = await pool.query<{
      identifier: string
    }>(
      `SELECT identifier
       FROM verification
       WHERE identifier LIKE 'reset-password:%'
       ORDER BY expires_at DESC
       LIMIT 1`
    )

    const identifier = result.rows.at(0)?.identifier

    return identifier?.replace("reset-password:", "") ?? null
  } catch (error) {
    const databaseError = error as { code?: string }

    if (databaseError.code === "42P01") {
      return null
    }

    throw error
  }
}

const countUsersByEmail = async (email: string) => {
  try {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM "user"
       WHERE email = $1`,
      [email]
    )

    return Number(result.rows.at(0)?.count ?? "0")
  } catch (error) {
    const databaseError = error as { code?: string }

    if (databaseError.code === "42P01") {
      return 0
    }

    throw error
  }
}

describe("auth app", () => {
  beforeEach(() => {
    sendEmailVerificationEmailMock.mockClear()
    sendExistingUserSignupNoticeMock.mockClear()
    sendPasswordResetEmailMock.mockClear()
  })

  it("returns the expected /up healthcheck payload", async () => {
    await truncateAuthTables()

    const response = await app.request("/up")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual(upResponse)
  })

  it("exports AppType for typed Hono clients", () => {
    const client = hc<AppType>("http://localhost")

    expectTypeOf(client.up.$get).toBeFunction()
  })

  it("exposes the Better Auth ok route", async () => {
    await truncateAuthTables()

    const { json, response } = await requestJson("/api/auth/ok")

    expect(response.status).toBe(200)
    expect(json).toStrictEqual({
      ok: true,
    })
  })

  it("responds to auth CORS preflight requests for trusted origins", async () => {
    await truncateAuthTables()

    const response = await app.request("/api/auth/sign-in/email", {
      headers: {
        "access-control-request-headers": "content-type",
        "access-control-request-method": "POST",
        origin: "http://localhost:3000",
      },
      method: "OPTIONS",
    })

    expect(response.status).toBe(204)
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000"
    )
    expect(response.headers.get("access-control-allow-credentials")).toBe(
      "true"
    )
  })

  it("supports email sign up and sign in", async () => {
    await truncateAuthTables()

    const signUpResponse = await requestJson("/api/auth/sign-up/email", {
      body: JSON.stringify({
        callbackURL: "http://localhost:3000/login",
        email: "ada@example.com",
        name: "Ada Lovelace",
        password: "password-1234",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    })

    expect(signUpResponse.response.status).toBe(200)
    expect(signUpResponse.json).toMatchObject({
      user: {
        email: "ada@example.com",
        name: "Ada Lovelace",
      },
    })
    expect(sendEmailVerificationEmailMock).toHaveBeenCalledOnce()

    const verificationEmailInput = sendEmailVerificationEmailMock.mock.calls
      .at(0)
      ?.at(0) as
      | {
          to: string
          verificationUrl: string
        }
      | undefined

    expect(verificationEmailInput?.to).toBe("ada@example.com")
    expect(verificationEmailInput?.verificationUrl).toContain(
      "/api/auth/verify-email"
    )
    expect(verificationEmailInput?.verificationUrl).toContain(
      encodeURIComponent("http://localhost:3000/login")
    )

    const signInResponse = await requestJson("/api/auth/sign-in/email", {
      body: JSON.stringify({
        email: "ada@example.com",
        password: "password-1234",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    })

    expect(signInResponse.response.status).toBe(200)
    expect(signInResponse.json).toMatchObject({
      user: {
        email: "ada@example.com",
      },
    })
  })

  it("sends an existing-user signup notice when a signup email already exists", async () => {
    await truncateAuthTables()

    await requestJson("/api/auth/sign-up/email", {
      body: JSON.stringify({
        callbackURL: "http://localhost:3000/login",
        email: "ada@example.com",
        name: "Ada Lovelace",
        password: "password-1234",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    })

    sendExistingUserSignupNoticeMock.mockClear()

    const duplicateSignUpResponse = await requestJson("/api/auth/sign-up/email", {
      body: JSON.stringify({
        callbackURL: "http://localhost:3000/login",
        email: "ada@example.com",
        name: "Ada Byron",
        password: "password-1234",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    })

    expect(duplicateSignUpResponse.response.status).toBe(200)
    expect(sendExistingUserSignupNoticeMock).toHaveBeenCalledWith({
      signInUrl: "http://localhost:3000/login",
      to: "ada@example.com",
    })
    await expect(countUsersByEmail("ada@example.com")).resolves.toBe(1)
  })

  it("issues a password reset token", async () => {
    await truncateAuthTables()

    await requestJson("/api/auth/sign-up/email", {
      body: JSON.stringify({
        callbackURL: "http://localhost:3000/login",
        email: "grace@example.com",
        name: "Grace Hopper",
        password: "password-1234",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    })

    const requestResetResponse = await requestJson(
      "/api/auth/request-password-reset",
      {
        body: JSON.stringify({
          email: "grace@example.com",
          redirectTo: "http://localhost:3000/reset-password",
        }),
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        method: "POST",
      }
    )

    expect(requestResetResponse.response.status).toBe(200)
    expect(requestResetResponse.json).toStrictEqual({
      message:
        "If this email exists in our system, check your email for the reset link",
      status: true,
    })

    const resetToken = await findLatestResetToken()

    expect(resetToken).toBeTruthy()
    expect(sendPasswordResetEmailMock).toHaveBeenCalledOnce()
    if (!resetToken) {
      throw new Error("Expected a reset token to be stored")
    }

    const emailInput = sendPasswordResetEmailMock.mock.calls.at(0)?.at(0) as
      | {
          resetUrl: string
          to: string
        }
      | undefined

    expect(emailInput?.to).toBe("grace@example.com")
    expect(emailInput?.resetUrl).toContain(
      "http://localhost:3000/reset-password"
    )
    expect(emailInput?.resetUrl).toContain(resetToken)
  })

  it("resets the password and rejects the old credential", async () => {
    await truncateAuthTables()

    await requestJson("/api/auth/sign-up/email", {
      body: JSON.stringify({
        callbackURL: "http://localhost:3000/login",
        email: "grace@example.com",
        name: "Grace Hopper",
        password: "password-1234",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    })

    await requestJson("/api/auth/request-password-reset", {
      body: JSON.stringify({
        email: "grace@example.com",
        redirectTo: "http://localhost:3000/reset-password",
      }),
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      method: "POST",
    })

    const resetToken = await findLatestResetToken()

    const resetPasswordResponse = await requestJson(
      "/api/auth/reset-password",
      {
        body: JSON.stringify({
          newPassword: "password-5678",
          token: resetToken,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }
    )

    expect(resetPasswordResponse.response.status).toBe(200)
    expect(resetPasswordResponse.json).toStrictEqual({
      status: true,
    })

    const oldPasswordResponse = await requestJson("/api/auth/sign-in/email", {
      body: JSON.stringify({
        email: "grace@example.com",
        password: "password-1234",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    })

    expect(oldPasswordResponse.response.ok).toBeFalsy()

    const newPasswordResponse = await requestJson("/api/auth/sign-in/email", {
      body: JSON.stringify({
        email: "grace@example.com",
        password: "password-5678",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    })

    expect(newPasswordResponse.response.ok).toBeTruthy()
    expect(newPasswordResponse.json).toMatchObject({
      user: {
        email: "grace@example.com",
      },
    })
  })
})
