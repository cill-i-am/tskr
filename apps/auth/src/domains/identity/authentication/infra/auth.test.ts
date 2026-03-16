const {
  betterAuthMock,
  createAuthenticationEmailServiceMock,
  drizzleAdapterMock,
  emailOTPMock,
  resolveDefaultCookieAttributesMock,
  sendExistingUserSignupNoticeMock,
  sendPasswordResetEmailMock,
  sendSignupVerificationOtpEmailMock,
} = vi.hoisted(() => {
  const sendExistingUserSignupNotice = vi.fn(async () => ({
    id: "existing-user-id",
  }))
  const sendPasswordResetEmail = vi.fn(async () => ({ id: "reset-id" }))
  const sendSignupVerificationOtpEmail = vi.fn(async () => ({
    id: "signup-otp-id",
  }))
  const emailOTP = vi.fn((options) => ({
    id: "email-otp",
    options,
  }))

  return {
    betterAuthMock: vi.fn(() => ({
      handler: vi.fn(),
    })),
    createAuthenticationEmailServiceMock: vi.fn(() => ({
      sendExistingUserSignupNotice,
      sendPasswordResetEmail,
      sendSignupVerificationOtpEmail,
    })),
    drizzleAdapterMock: vi.fn(() => "drizzle-adapter"),
    emailOTPMock: emailOTP,
    resolveDefaultCookieAttributesMock: vi.fn(() => ({
      secure: true,
    })),
    sendExistingUserSignupNoticeMock: sendExistingUserSignupNotice,
    sendPasswordResetEmailMock: sendPasswordResetEmail,
    sendSignupVerificationOtpEmailMock: sendSignupVerificationOtpEmail,
  }
})

vi.mock<typeof import("better-auth")>(import("better-auth"), () => ({
  betterAuth: betterAuthMock,
}))

vi.mock<typeof import("better-auth/adapters/drizzle")>(
  import("better-auth/adapters/drizzle"),
  () => ({
    drizzleAdapter: drizzleAdapterMock,
  })
)

vi.mock<typeof import("better-auth/plugins/email-otp")>(
  import("better-auth/plugins/email-otp"),
  () => ({
    emailOTP: emailOTPMock,
  })
)

vi.mock<typeof import("./cookie-attributes.js")>(
  import("./cookie-attributes.js"),
  () => ({
    resolveDefaultCookieAttributes: resolveDefaultCookieAttributesMock,
  })
)

vi.mock<typeof import("./database.js")>(import("./database.js"), () => ({
  database: "database",
}))

vi.mock<typeof import("./email-service.js")>(
  import("./email-service.js"),
  () => ({
    createAuthenticationEmailService: createAuthenticationEmailServiceMock,
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
    onExistingUserSignUp: (input: { user: { email: string } }) => unknown
    requireEmailVerification: boolean
    sendResetPassword: (input: {
      url: string
      user: { email: string }
    }) => unknown
  }
  emailVerification: {
    autoSignInAfterVerification: boolean
    sendOnSignIn: boolean
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
  return betterAuthMock.mock.calls.at(0)?.at(0) as AuthConfiguration
}

describe("auth config", () => {
  beforeEach(() => {
    betterAuthMock.mockClear()
    createAuthenticationEmailServiceMock.mockClear()
    drizzleAdapterMock.mockClear()
    emailOTPMock.mockClear()
    resolveDefaultCookieAttributesMock.mockClear()
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
    expect(config.emailVerification.autoSignInAfterVerification).toBeTruthy()
    expect(config.emailVerification.sendOnSignIn).toBeTruthy()
    expect(emailOTPMock).toHaveBeenCalledTimes(1)
    expect(emailOtpPlugin?.id).toBe("email-otp")
    expect(emailOtpPlugin?.options.allowedAttempts).toBe(3)
    expect(emailOtpPlugin?.options.expiresIn).toBe(300)
    expect(emailOtpPlugin?.options.otpLength).toBe(6)
    expect(
      emailOtpPlugin?.options.overrideDefaultEmailVerification
    ).toBeTruthy()
    expect(emailOtpPlugin?.options.storeOTP).toBe("hashed")

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

    await emailOtpPlugin?.options.sendVerificationOTP({
      email: "grace@example.com",
      otp: "482913",
      type: "email-verification",
    })

    expect(sendSignupVerificationOtpEmailMock).toHaveBeenCalledWith({
      code: "482913",
      to: "grace@example.com",
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
      .mockReturnValue()
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
      .mockReturnValue()
    sendSignupVerificationOtpEmailMock.mockRejectedValueOnce(
      new Error("signup otp failed")
    )
    sendExistingUserSignupNoticeMock.mockRejectedValueOnce(
      new Error("existing-user failed")
    )

    try {
      const config = await loadAuthConfiguration()
      const emailOtpPlugin = config.plugins.at(0)

      await emailOtpPlugin?.options.sendVerificationOTP({
        email: "grace@example.com",
        otp: "482913",
        type: "sign-in",
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
        "[auth:email] failed to send signup verification otp email",
        expect.objectContaining({
          otpType: "sign-in",
          recipient: "grace@example.com",
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
