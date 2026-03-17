import { hc } from "hono/client"

import { createPgPool } from "@workspace/db"

import type { AppType } from "./app.js"

const {
  sendEmailVerificationEmailMock,
  sendExistingUserSignupNoticeMock,
  sendPasswordResetEmailMock,
  sendSignupVerificationOtpEmailMock,
} = vi.hoisted(() => ({
  sendEmailVerificationEmailMock: vi.fn(() =>
    Promise.resolve({
      id: "test-verification-id",
    })
  ),
  sendExistingUserSignupNoticeMock: vi.fn(() =>
    Promise.resolve({
      id: "test-existing-user-id",
    })
  ),
  sendPasswordResetEmailMock: vi.fn(() =>
    Promise.resolve({
      id: "test-password-reset-id",
    })
  ),
  sendSignupVerificationOtpEmailMock: vi.fn(() =>
    Promise.resolve({
      id: "test-signup-otp-id",
    })
  ),
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
const { upResponse } = await import("./domains/system/healthcheck/index.js")

const pool = createPgPool()

const requestJson = async (path: string, init?: RequestInit) => {
  const response = await app.request(path, init)

  return {
    json: response.headers.get("content-type")?.includes("application/json")
      ? await response.json()
      : null,
    response,
  }
}

const latestSignupVerificationOtpEmail = () =>
  sendSignupVerificationOtpEmailMock.mock.calls.at(-1)?.at(0) as
    | {
        code: string
        to: string
      }
    | undefined

const truncateAuthTables = async () => {
  try {
    await pool.query(
      'TRUNCATE TABLE "auth"."session", "auth"."account", "auth"."verification", "auth"."user" RESTART IDENTITY CASCADE'
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
       FROM "auth"."verification"
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
       FROM "auth"."user"
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
    sendSignupVerificationOtpEmailMock.mockClear()
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

  it("signs up with otp verification and auto-signs in after verification", async () => {
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
      token: null,
      user: {
        email: "ada@example.com",
        name: "Ada Lovelace",
      },
    })
    expect(sendSignupVerificationOtpEmailMock).toHaveBeenCalledOnce()
    expect(sendEmailVerificationEmailMock).not.toHaveBeenCalled()

    const verificationOtpEmailInput = latestSignupVerificationOtpEmail()

    expect(verificationOtpEmailInput?.to).toBe("ada@example.com")
    expect(verificationOtpEmailInput?.code).toMatch(/^\d{6}$/u)

    const verifyEmailResponse = await requestJson(
      "/api/auth/email-otp/verify-email",
      {
        body: JSON.stringify({
          email: "ada@example.com",
          otp: verificationOtpEmailInput?.code,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }
    )

    expect(verifyEmailResponse.response.status).toBe(200)
    expect(verifyEmailResponse.json).toMatchObject({
      status: true,
      token: expect.any(String),
      user: {
        email: "ada@example.com",
        emailVerified: true,
      },
    })
  })

  it("blocks password sign-in for unverified users and sends a fresh otp", async () => {
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

    sendSignupVerificationOtpEmailMock.mockClear()
    sendExistingUserSignupNoticeMock.mockClear()

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

    expect(signInResponse.response.status).toBe(403)
    expect(signInResponse.json).toMatchObject({
      code: expect.any(String),
    })
    expect(sendSignupVerificationOtpEmailMock).toHaveBeenCalledOnce()
    expect(sendExistingUserSignupNoticeMock).not.toHaveBeenCalled()
    expect(latestSignupVerificationOtpEmail()).toMatchObject({
      to: "ada@example.com",
    })
  })

  it("rejects duplicate signup attempts when a signup email already exists", async () => {
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

    sendSignupVerificationOtpEmailMock.mockClear()

    const duplicateSignUpResponse = await requestJson(
      "/api/auth/sign-up/email",
      {
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
      }
    )
    expect(duplicateSignUpResponse.response.status).toBe(422)
    expect(duplicateSignUpResponse.json).toMatchObject({
      code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
      message: expect.any(String),
    })
    expect(sendExistingUserSignupNoticeMock).not.toHaveBeenCalled()
    expect(sendSignupVerificationOtpEmailMock).not.toHaveBeenCalled()
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
    expect(sendPasswordResetEmailMock).toHaveBeenCalledTimes(1)
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
    expect(emailInput?.resetUrl).toContain("/api/auth/reset-password/")
    expect(emailInput?.resetUrl).toContain(
      encodeURIComponent("http://localhost:3000/reset-password")
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

    const verificationOtpEmailInput = latestSignupVerificationOtpEmail()

    expect(verificationOtpEmailInput?.code).toMatch(/^\d{6}$/u)

    const verifyEmailResponse = await requestJson(
      "/api/auth/email-otp/verify-email",
      {
        body: JSON.stringify({
          email: "grace@example.com",
          otp: verificationOtpEmailInput?.code,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }
    )

    expect(verifyEmailResponse.response.ok).toBeTruthy()

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
