const {
  betterAuthMock,
  createAuthenticationEmailServiceMock,
  drizzleAdapterMock,
  emailOTPMock,
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
  const emailOTP = vi.fn((options) => ({
    id: "email-otp",
    options,
  }))

  return {
    betterAuthMock: vi.fn(() => ({
      handler: vi.fn(),
    })),
    createAuthenticationEmailServiceMock: vi.fn(() => emailService),
    drizzleAdapterMock: vi.fn(() => "drizzle-adapter"),
    emailOTPMock: emailOTP,
    resolveDefaultCookieAttributesMock: vi.fn(() => ({
      sameSite: "none" as const,
    })),
    sendEmailVerificationEmailMock: sendEmailVerificationEmail,
    sendExistingUserSignupNoticeMock: sendExistingUserSignupNotice,
    sendPasswordResetEmailMock: sendPasswordResetEmail,
    sendSignupVerificationOtpEmailMock: sendSignupVerificationOtpEmail,
  }
})

vi.mock<typeof import("better-auth")>(import("better-auth"), () => ({
  betterAuth: betterAuthMock as never,
}))

vi.mock<typeof import("better-auth/adapters/drizzle")>(
  import("better-auth/adapters/drizzle"),
  () => ({
    drizzleAdapter: drizzleAdapterMock as never,
  })
)

vi.mock<typeof import("better-auth/plugins/email-otp")>(
  import("better-auth/plugins/email-otp"),
  () => ({
    emailOTP: emailOTPMock as never,
  })
)

vi.mock<typeof import("./cookie-attributes.js")>(
  import("./cookie-attributes.js"),
  () => ({
    resolveDefaultCookieAttributes: resolveDefaultCookieAttributesMock as never,
  })
)

vi.mock<typeof import("./database.js")>(import("./database.js"), () => ({
  database: {} as never,
}))

vi.mock<typeof import("./email-service.js")>(
  import("./email-service.js"),
  () => ({
    createAuthenticationEmailService:
      createAuthenticationEmailServiceMock as never,
  })
)

vi.mock<typeof import("./env.js")>(import("./env.js"), () => ({
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
    requireEmailVerification: boolean
    sendResetPassword: (input: {
      url: string
      user: { email: string }
    }) => Promise<void>
  }
  emailVerification: {
    autoSignInAfterVerification: boolean
    sendOnSignIn: boolean
    sendOnSignUp: boolean
  }
  plugins: {
    id: string
    options: {
      allowedAttempts: number
      expiresIn: number
      otpLength: number
      overrideDefaultEmailVerification: boolean
      storeOTP: string
      sendVerificationOTP: (input: {
        email: string
        otp: string
        type:
          | "change-email"
          | "email-verification"
          | "forget-password"
          | "sign-in"
      }) => Promise<void>
    }
  }[]
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
    emailOTPMock.mockClear()
    resolveDefaultCookieAttributesMock.mockClear()
    sendEmailVerificationEmailMock.mockClear()
    sendExistingUserSignupNoticeMock.mockClear()
    sendPasswordResetEmailMock.mockClear()
    sendSignupVerificationOtpEmailMock.mockClear()
    vi.resetModules()
  })

  it("wires the email otp auth flow to the auth email service", async () => {
    const config = await loadAuthConfiguration()
    const emailOtpPlugin = config.plugins.at(0)

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

    expect(config.emailAndPassword.autoSignIn).toBeFalsy()
    expect(config.emailAndPassword.requireEmailVerification).toBeTruthy()
    expect("onExistingUserSignUp" in config.emailAndPassword).toBeFalsy()
    expect(config.emailVerification.autoSignInAfterVerification).toBeTruthy()
    expect(config.emailVerification.sendOnSignIn).toBeTruthy()
    expect(config.emailVerification.sendOnSignUp).toBeTruthy()
    expect(emailOTPMock).toHaveBeenCalledOnce()
    expect(emailOtpPlugin?.id).toBe("email-otp")
    expect(emailOtpPlugin?.options.allowedAttempts).toBe(3)
    expect(emailOtpPlugin?.options.expiresIn).toBe(300)
    expect(emailOtpPlugin?.options.otpLength).toBe(6)
    expect(
      emailOtpPlugin?.options.overrideDefaultEmailVerification
    ).toBeTruthy()
    expect(emailOtpPlugin?.options.storeOTP).toBe("hashed")

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

    await emailOtpPlugin?.options.sendVerificationOTP({
      email: "grace@example.com",
      otp: "482913",
      type: "email-verification",
    })

    expect(sendSignupVerificationOtpEmailMock).toHaveBeenCalledWith({
      code: "482913",
      to: "grace@example.com",
    })
    expect(sendEmailVerificationEmailMock).not.toHaveBeenCalled()
    expect(sendExistingUserSignupNoticeMock).not.toHaveBeenCalled()
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
    sendSignupVerificationOtpEmailMock.mockRejectedValueOnce(
      new Error("signup otp failed")
    )

    try {
      const config = await loadAuthConfiguration()
      const emailOtpPlugin = config.plugins.at(0)

      await emailOtpPlugin?.options.sendVerificationOTP({
        email: "grace@example.com",
        otp: "482913",
        type: "sign-in",
      })
      await Promise.resolve()
      await Promise.resolve()

      expect(consoleErrorMock).toHaveBeenCalledOnce()
      expect(consoleErrorMock).toHaveBeenCalledWith(
        "[auth:email] failed to send signup verification otp email",
        expect.objectContaining({
          otpType: "sign-in",
          recipient: "grace@example.com",
        })
      )
    } finally {
      consoleErrorMock.mockRestore()
    }
  })
})
