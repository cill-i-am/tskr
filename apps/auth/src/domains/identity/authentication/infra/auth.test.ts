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
    trustedOrigins: ["http://localhost:3000"],
  }),
}))

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
    await import("./auth.js")

    expect(createAuthenticationEmailServiceMock).toHaveBeenCalledWith({
      betterAuthSecret: "test-secret",
      betterAuthUrl: "http://localhost:3002",
      databaseUrl: "postgres://postgres:postgres@localhost:5432/tskr",
      emailFrom: "TSKR <noreply@tskr.app>",
      emailProvider: "console",
      emailReplyTo: "support@tskr.app",
      resendApiKey: undefined,
      trustedOrigins: ["http://localhost:3000"],
    })

    const config = betterAuthMock.mock.calls.at(0)?.at(0) as {
      emailAndPassword: {
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
      signInUrl: "http://localhost:3000/login",
      to: "grace@example.com",
    })
  })
})
