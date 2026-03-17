const {
  betterAuthMock,
  createAuthenticationEmailServiceMock,
  drizzleAdapterMock,
  resolveDefaultCookieAttributesMock,
  sendEmailVerificationEmailMock,
  sendExistingUserSignupNoticeMock,
  sendPasswordResetEmailMock,
  sendSignupVerificationOtpEmailMock,
} = vi.hoisted(() => {
  const sendEmailVerificationEmail = vi.fn(() =>
    Promise.resolve({
      id: "verification-id",
    })
  )
  const sendExistingUserSignupNotice = vi.fn(() =>
    Promise.resolve({
      id: "existing-user-id",
    })
  )
  const sendPasswordResetEmail = vi.fn(() =>
    Promise.resolve({ id: "reset-id" })
  )
  const sendSignupVerificationOtpEmail = vi.fn(() =>
    Promise.resolve({
      id: "signup-otp-id",
    })
  )
  const emailService = {
    sendEmailVerificationEmail,
    sendExistingUserSignupNotice,
    sendPasswordResetEmail,
    sendSignupVerificationOtpEmail,
  }

  return {
    betterAuthMock: vi.fn(() => ({
      handler: vi.fn(),
    })),
    createAuthenticationEmailServiceMock: vi.fn(() => emailService),
    drizzleAdapterMock: vi.fn(() => "drizzle-adapter"),
    resolveDefaultCookieAttributesMock: vi.fn(() => ({
      sameSite: "none" as const,
    })),
    sendEmailVerificationEmailMock: sendEmailVerificationEmail,
    sendExistingUserSignupNoticeMock: sendExistingUserSignupNotice,
    sendPasswordResetEmailMock: sendPasswordResetEmail,
    sendSignupVerificationOtpEmailMock: sendSignupVerificationOtpEmail,
  }
})

vi.mock<typeof import('better-auth')>(import('better-auth'), () => ({
  betterAuth: betterAuthMock as never,
}))

vi.mock<typeof import('better-auth/adapters/drizzle')>(import('better-auth/adapters/drizzle'), () => ({
  drizzleAdapter: drizzleAdapterMock as never,
}))

vi.mock<typeof import('./cookie-attributes.js')>(import('./cookie-attributes.js'), () => ({
  resolveDefaultCookieAttributes: resolveDefaultCookieAttributesMock as never,
}))

vi.mock<typeof import('./database.js')>(import('./database.js'), () => ({
  database: {} as never,
}))

vi.mock<typeof import('./email-service.js')>(import('./email-service.js'), () => ({
  createAuthenticationEmailService:
    createAuthenticationEmailServiceMock as never,
}))

vi.mock<typeof import('./env.js')>(import('./env.js'), () => ({
  parseAuthenticationEnv: () => ({
    betterAuthSecret: "test-secret",
    betterAuthUrl: "http://localhost:3002",
    emailFrom: "TSKR <noreply@tskr.app>",
    emailProvider: "console",
    emailReplyTo: "support@tskr.app",
    resendApiKey: undefined,
    trustedOrigins: ["http://localhost:3000"],
    webBaseUrl: "https://app.example.com",
  }),
}))

interface AuthConfiguration {
  emailAndPassword: {
    autoSignIn: boolean
    onExistingUserSignUp: (input: { user: { email: string } }) => Promise<void>
    requireEmailVerification: boolean
    sendResetPassword: (input: {
      url: string
      user: { email: string }
    }) => Promise<void>
  }
  emailVerification: {
    sendOnSignUp: boolean
    sendVerificationEmail: (input: {
      url: string
      user: { email: string }
    }) => Promise<void>
  }
}

const loadAuthConfiguration = async (): Promise<AuthConfiguration> => {
  await import("./auth.js")
  const config = betterAuthMock.mock.calls.at(0)?.at(0)

  if (!config) {
    throw new Error("Expected betterAuth to be called with a config")
  }

  return config as AuthConfiguration
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
    sendSignupVerificationOtpEmailMock.mockClear()
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
      trustedOrigins: ["http://localhost:3000"],
      webBaseUrl: "https://app.example.com",
    })

    expect(config.emailAndPassword.autoSignIn).toBeTruthy()
    expect(config.emailAndPassword.requireEmailVerification).toBeFalsy()
    expect(config.emailVerification.sendOnSignUp).toBeTruthy()

    await config.emailAndPassword.sendResetPassword({
      url: "http://localhost:3000/reset-password?token=reset-token",
      user: {
        email: "grace@example.com",
      },
    })

    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith({
      resetUrl: "http://localhost:3000/reset-password?token=reset-token",
      to: "grace@example.com",
    })

    await config.emailVerification.sendVerificationEmail({
      url: "http://localhost:3000/verify-email?token=verify-token",
      user: {
        email: "grace@example.com",
      },
    })

    expect(sendEmailVerificationEmailMock).toHaveBeenCalledWith({
      to: "grace@example.com",
      verificationUrl: "http://localhost:3000/verify-email?token=verify-token",
    })

    await config.emailAndPassword.onExistingUserSignUp({
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
    const consoleErrorMock = vi.spyOn(console, "error").mockReturnValue()
    sendPasswordResetEmailMock.mockRejectedValueOnce(new Error("reset failed"))

    try {
      const config = await loadAuthConfiguration()
      await config.emailAndPassword.sendResetPassword({
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
    const consoleErrorMock = vi.spyOn(console, "error").mockReturnValue()
    sendEmailVerificationEmailMock.mockRejectedValueOnce(
      new Error("verification failed")
    )
    sendExistingUserSignupNoticeMock.mockRejectedValueOnce(
      new Error("existing-user failed")
    )

    try {
      const config = await loadAuthConfiguration()
      await config.emailVerification.sendVerificationEmail({
        url: "http://localhost:3000/verify-email?token=verify-token",
        user: {
          email: "grace@example.com",
        },
      })
      await config.emailAndPassword.onExistingUserSignUp({
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
