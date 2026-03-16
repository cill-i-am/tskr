const {
  betterAuthMock,
  createAuthenticationEmailServiceMock,
  drizzleAdapterMock,
  resolveDefaultCookieAttributesMock,
  sendEmailVerificationMock,
  sendExistingUserSignUpNoticeMock,
  sendPasswordResetMock,
} = vi.hoisted(() => {
  const sendEmailVerification = vi.fn(async () => ({ id: "verification-id" }))
  const sendExistingUserSignUpNotice = vi.fn(async () => ({
    id: "existing-user-id",
  }))
  const sendPasswordReset = vi.fn(async () => ({ id: "reset-id" }))

  return {
    betterAuthMock: vi.fn(() => ({
      handler: vi.fn(),
    })),
    createAuthenticationEmailServiceMock: vi.fn(() => ({
      sendEmailVerification,
      sendExistingUserSignUpNotice,
      sendPasswordReset,
    })),
    drizzleAdapterMock: vi.fn(() => "drizzle-adapter"),
    resolveDefaultCookieAttributesMock: vi.fn(() => ({
      secure: true,
    })),
    sendEmailVerificationMock: sendEmailVerification,
    sendExistingUserSignUpNoticeMock: sendExistingUserSignUpNotice,
    sendPasswordResetMock: sendPasswordReset,
  }
})

vi.mock("better-auth", () => ({
  betterAuth: betterAuthMock,
}))

vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: drizzleAdapterMock,
}))

vi.mock("./cookie-attributes.js", () => ({
  resolveDefaultCookieAttributes: resolveDefaultCookieAttributesMock,
}))

vi.mock("./database.js", () => ({
  database: "database",
}))

vi.mock("./schema.js", () => ({
  user: "schema",
}))

vi.mock("./email-service.js", () => ({
  createAuthenticationEmailService: createAuthenticationEmailServiceMock,
}))

vi.mock("./env.js", () => ({
  parseAuthenticationEnv: () => ({
    betterAuthSecret: "test-secret",
    betterAuthUrl: "http://localhost:3002",
    databaseUrl: "postgres://postgres:postgres@localhost:5432/tskr",
    emailFrom: "TSKR <noreply@tskr.app>",
    emailProvider: "console",
    emailReplyTo: "support@tskr.app",
    resendApiKey: undefined,
    webBaseUrl: "https://app.example.com",
    trustedOrigins: ["http://localhost:3000"],
  }),
}))

type AuthConfiguration = {
  emailAndPassword: {
    autoSignIn: boolean
    onExistingUserSignUp: (input: {
      user: { email: string }
    }) => unknown
    requireEmailVerification: boolean
    sendResetPassword: (input: {
      url: string
      user: { email: string }
    }) => unknown
  }
  emailVerification: {
    sendVerificationEmail: (input: {
      url: string
      user: { email: string }
    }) => unknown
  }
}

const loadAuthConfiguration = async (): Promise<AuthConfiguration> => {
  await import("./auth.js")
  return betterAuthMock.mock.calls.at(0)?.at(0) as AuthConfiguration
}

describe("auth config", () => {
  beforeEach(() => {
    betterAuthMock.mockClear()
    createAuthenticationEmailServiceMock.mockClear()
    drizzleAdapterMock.mockClear()
    resolveDefaultCookieAttributesMock.mockClear()
    sendEmailVerificationMock.mockClear()
    sendExistingUserSignUpNoticeMock.mockClear()
    sendPasswordResetMock.mockClear()
    vi.resetModules()
  })

  it("wires email hooks to the auth email service", async () => {
    const config = await loadAuthConfiguration()

    expect(createAuthenticationEmailServiceMock).toHaveBeenCalledWith({
      betterAuthSecret: "test-secret",
      betterAuthUrl: "http://localhost:3002",
      databaseUrl: "postgres://postgres:postgres@localhost:5432/tskr",
      emailFrom: "TSKR <noreply@tskr.app>",
      emailProvider: "console",
      emailReplyTo: "support@tskr.app",
      resendApiKey: undefined,
      webBaseUrl: "https://app.example.com",
      trustedOrigins: ["http://localhost:3000"],
    })

    expect(config.emailAndPassword.autoSignIn).toBe(false)
    expect(config.emailAndPassword.requireEmailVerification).toBe(false)

    config.emailAndPassword.sendResetPassword({
      url: "http://localhost:3000/reset-password?token=reset-token",
      user: {
        email: "grace@example.com",
      },
    })

    expect(sendPasswordResetMock).toHaveBeenCalledWith({
      resetUrl: "http://localhost:3000/reset-password?token=reset-token",
      to: "grace@example.com",
    })

    config.emailVerification.sendVerificationEmail({
      url: "http://localhost:3000/verify-email?token=verify-token",
      user: {
        email: "grace@example.com",
      },
    })

    expect(sendEmailVerificationMock).toHaveBeenCalledWith({
      to: "grace@example.com",
      verificationUrl: "http://localhost:3000/verify-email?token=verify-token",
    })

    config.emailAndPassword.onExistingUserSignUp({
      user: {
        email: "grace@example.com",
      },
    })

    expect(sendExistingUserSignUpNoticeMock).toHaveBeenCalledWith({
      signInUrl: "https://app.example.com/login",
      to: "grace@example.com",
    })
  })

  it("logs delivery errors from fire-and-forget email hooks", async () => {
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    sendPasswordResetMock.mockRejectedValueOnce(new Error("reset failed"))
    sendEmailVerificationMock.mockRejectedValueOnce(
      new Error("verification failed")
    )
    sendExistingUserSignUpNoticeMock.mockRejectedValueOnce(
      new Error("existing-user failed")
    )

    try {
      const config = await loadAuthConfiguration()
      config.emailAndPassword.sendResetPassword({
        url: "http://localhost:3000/reset-password?token=reset-token",
        user: {
          email: "grace@example.com",
        },
      })
      config.emailVerification.sendVerificationEmail({
        url: "http://localhost:3000/verify-email?token=verify-token",
        user: {
          email: "grace@example.com",
        },
      })
      config.emailAndPassword.onExistingUserSignUp({
        user: {
          email: "grace@example.com",
        },
      })

      await Promise.resolve()
      await Promise.resolve()

      expect(consoleErrorMock).toHaveBeenCalledTimes(3)
      expect(consoleErrorMock).toHaveBeenCalledWith(
        "[auth:email] failed to send password reset email",
        expect.objectContaining({
          recipient: "grace@example.com",
          resetUrl: "http://localhost:3000/reset-password?token=reset-token",
        })
      )
      expect(consoleErrorMock).toHaveBeenCalledWith(
        "[auth:email] failed to send verification email",
        expect.objectContaining({
          recipient: "grace@example.com",
          verificationUrl:
            "http://localhost:3000/verify-email?token=verify-token",
        })
      )
      expect(consoleErrorMock).toHaveBeenCalledWith(
        "[auth:email] failed to send existing-user signup notice email",
        expect.objectContaining({
          recipient: "grace@example.com",
          signInUrl: "https://app.example.com/login",
        })
      )
    } finally {
      consoleErrorMock.mockRestore()
    }
  })
})
