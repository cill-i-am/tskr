const {
  betterAuthMock,
  createAuthenticationEmailServiceMock,
  drizzleAdapterMock,
  resolveDefaultCookieAttributesMock,
  sendEmailVerificationEmailMock,
  sendExistingUserSignupNoticeMock,
  sendPasswordResetEmailMock,
} = vi.hoisted(() => {
  const sendEmailVerificationEmail = vi.fn(async () => ({
    id: "verification-id",
  }))
  const sendExistingUserSignupNotice = vi.fn(async () => ({
    id: "existing-user-id",
  }))
  const sendPasswordResetEmail = vi.fn(async () => ({ id: "reset-id" }))

  return {
    betterAuthMock: vi.fn(() => ({
      handler: vi.fn(),
    })),
    createAuthenticationEmailServiceMock: vi.fn(() => ({
      sendEmailVerificationEmail,
      sendExistingUserSignupNotice,
      sendPasswordResetEmail,
    })),
    drizzleAdapterMock: vi.fn(() => "drizzle-adapter"),
    resolveDefaultCookieAttributesMock: vi.fn(() => ({
      secure: true,
    })),
    sendEmailVerificationEmailMock: sendEmailVerificationEmail,
    sendExistingUserSignupNoticeMock: sendExistingUserSignupNotice,
    sendPasswordResetEmailMock: sendPasswordResetEmail,
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

vi.mock("./email-service.js", () => ({
  createAuthenticationEmailService: createAuthenticationEmailServiceMock,
}))

vi.mock("./env.js", () => ({
  parseAuthenticationEnv: () => ({
    betterAuthSecret: "test-secret",
    betterAuthUrl: "http://localhost:3002",
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
    sendOnSignUp: boolean
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
    sendEmailVerificationEmailMock.mockClear()
    sendExistingUserSignupNoticeMock.mockClear()
    sendPasswordResetEmailMock.mockClear()
    vi.resetModules()
  })

  it("wires email hooks to the auth email service", async () => {
    const config = await loadAuthConfiguration()

    expect(createAuthenticationEmailServiceMock).toHaveBeenCalledWith({
      betterAuthSecret: "test-secret",
      betterAuthUrl: "http://localhost:3002",
      emailFrom: "TSKR <noreply@tskr.app>",
      emailProvider: "console",
      emailReplyTo: "support@tskr.app",
      resendApiKey: undefined,
      webBaseUrl: "https://app.example.com",
      trustedOrigins: ["http://localhost:3000"],
    })

    expect(config.emailAndPassword.autoSignIn).toBe(true)
    expect(config.emailAndPassword.requireEmailVerification).toBe(false)
    expect(config.emailVerification.sendOnSignUp).toBe(true)

    config.emailAndPassword.sendResetPassword({
      url: "http://localhost:3000/reset-password?token=reset-token",
      user: {
        email: "grace@example.com",
      },
    })

    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith({
      resetUrl: "http://localhost:3000/reset-password?token=reset-token",
      to: "grace@example.com",
    })

    config.emailVerification.sendVerificationEmail({
      url: "http://localhost:3000/verify-email?token=verify-token",
      user: {
        email: "grace@example.com",
      },
    })

    expect(sendEmailVerificationEmailMock).toHaveBeenCalledWith({
      to: "grace@example.com",
      verificationUrl: "http://localhost:3000/verify-email?token=verify-token",
    })

    config.emailAndPassword.onExistingUserSignUp({
      user: {
        email: "grace@example.com",
      },
    })

    expect(sendExistingUserSignupNoticeMock).toHaveBeenCalledWith({
      signInUrl: "https://app.example.com/login",
      to: "grace@example.com",
    })
  })

  it("logs password reset delivery errors without surfacing them", async () => {
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    sendPasswordResetEmailMock.mockRejectedValueOnce(new Error("reset failed"))

    try {
      const config = await loadAuthConfiguration()
      config.emailAndPassword.sendResetPassword({
        url: "http://localhost:3000/reset-password?token=reset-token",
        user: {
          email: "grace@example.com",
        },
      })

      await Promise.resolve()
      await Promise.resolve()

      expect(consoleErrorMock).toHaveBeenCalledWith(
        "[auth:email] failed to send password reset email",
        expect.objectContaining({
          recipient: "grace@example.com",
          resetUrl: "http://localhost:3000/reset-password?token=reset-token",
        })
      )
    } finally {
      consoleErrorMock.mockRestore()
    }
  })

  it("logs delivery errors from fire-and-forget email hooks", async () => {
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    sendEmailVerificationEmailMock.mockRejectedValueOnce(
      new Error("verification failed")
    )
    sendExistingUserSignupNoticeMock.mockRejectedValueOnce(
      new Error("existing-user failed")
    )

    try {
      const config = await loadAuthConfiguration()
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

      expect(consoleErrorMock).toHaveBeenCalledTimes(2)
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
