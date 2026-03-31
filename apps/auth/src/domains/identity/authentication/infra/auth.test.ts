/* oxlint-disable vitest/prefer-called-once */
/* eslint-disable @typescript-eslint/consistent-type-imports */

const requireValue = <T>(value: T | null | undefined, label: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${label} to be defined`)
  }
  return value
}

const {
  betterAuthMock,
  createAuthenticationEmailServiceMock,
  drizzleAdapterMock,
  emailOTPMock,
  organizationMock,
  resolveCrossSubDomainCookiesMock,
  resolveDefaultCookieAttributesMock,
  sendEmailVerificationEmailMock,
  sendExistingUserSignupNoticeMock,
  sendPasswordResetEmailMock,
  sendSignupVerificationOtpEmailMock,
} = vi.hoisted(() => {
  const sendEmailVerificationEmail = vi.fn().mockResolvedValue({
    id: "verification-id",
  })
  const sendExistingUserSignupNotice = vi.fn().mockResolvedValue({
    id: "existing-user-id",
  })
  const sendPasswordResetEmail = vi.fn().mockResolvedValue({ id: "reset-id" })
  const sendSignupVerificationOtpEmail = vi.fn().mockResolvedValue({
    id: "signup-otp-id",
  })
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
    organizationMock: vi.fn((options) => ({
      id: "organization",
      options,
    })),
    resolveCrossSubDomainCookiesMock: vi.fn().mockReturnValue({
      domain: "tskr.localhost",
      enabled: true,
    }),
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

vi.mock<typeof import("better-auth/plugins/organization")>(
  import("better-auth/plugins/organization"),
  () => ({
    organization: organizationMock as never,
  })
)

vi.mock<typeof import("./cookie-attributes.js")>(
  import("./cookie-attributes.js"),
  () => ({
    resolveCrossSubDomainCookies: resolveCrossSubDomainCookiesMock as never,
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
    options?: {
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

const resetAuthMocks = () => {
  betterAuthMock.mockClear()
  createAuthenticationEmailServiceMock.mockClear()
  drizzleAdapterMock.mockClear()
  emailOTPMock.mockClear()
  organizationMock.mockClear()
  resolveCrossSubDomainCookiesMock.mockClear()
  resolveDefaultCookieAttributesMock.mockClear()
  sendEmailVerificationEmailMock.mockClear()
  sendExistingUserSignupNoticeMock.mockClear()
  sendPasswordResetEmailMock.mockClear()
  sendSignupVerificationOtpEmailMock.mockClear()
  vi.resetModules()
}

const requireEmailOtpPlugin = (config: AuthConfiguration) => {
  const plugin = config.plugins.find(
    (candidate) => candidate.id === "email-otp"
  )

  if (!plugin) {
    throw new Error("Expected the email OTP plugin to be configured")
  }

  return plugin
}

const requireOrganizationPlugin = (config: AuthConfiguration) => {
  const plugin = config.plugins.find(
    (candidate) => candidate.id === "organization"
  )

  if (!plugin) {
    throw new Error("Expected the organization plugin to be configured")
  }

  return plugin
}

const expectEmailServiceConfiguration = () => {
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
}

const expectEmailAndPasswordConfiguration = (config: AuthConfiguration) => {
  expect(config.emailAndPassword).toMatchObject({
    autoSignIn: false,
    requireEmailVerification: true,
  })
  expect("onExistingUserSignUp" in config.emailAndPassword).toBeFalsy()
}

const expectEmailVerificationConfiguration = (config: AuthConfiguration) => {
  expect(config.emailVerification).toMatchObject({
    autoSignInAfterVerification: true,
    sendOnSignIn: true,
    sendOnSignUp: true,
  })
}

const expectEmailOtpPluginConfiguration = (
  plugin: AuthConfiguration["plugins"][number]
) => {
  expect(emailOTPMock).toHaveBeenCalledTimes(1)
  expect(plugin).toMatchObject({
    id: "email-otp",
    options: {
      allowedAttempts: 3,
      expiresIn: 300,
      otpLength: 6,
      overrideDefaultEmailVerification: true,
      storeOTP: "hashed",
    },
  })
}

const expectOrganizationPluginConfiguration = (
  plugin: AuthConfiguration["plugins"][number]
) => {
  expect(organizationMock).toHaveBeenCalledTimes(1)
  expect(plugin).toMatchObject({
    id: "organization",
    options: {
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
    },
  })
}

const expectPasswordResetEmailDispatch = () => {
  expect(sendPasswordResetEmailMock).toHaveBeenCalledWith({
    resetUrl: "http://localhost:3000/reset-password?token=reset-token",
    to: "grace@example.com",
  })
}

const expectSignupVerificationOtpDispatch = () => {
  expect(sendSignupVerificationOtpEmailMock).toHaveBeenCalledWith({
    code: "482913",
    to: "grace@example.com",
  })
}

const expectLegacyEmailHooksToStayIdle = () => {
  expect(sendEmailVerificationEmailMock).not.toHaveBeenCalled()
  expect(sendExistingUserSignupNoticeMock).not.toHaveBeenCalled()
}

describe("auth config", () => {
  it("wires the email otp auth flow to the auth email service", async () => {
    resetAuthMocks()

    const config = await loadAuthConfiguration()
    const emailOtpPlugin = requireEmailOtpPlugin(config)
    const organizationPlugin = requireOrganizationPlugin(config)

    expectEmailServiceConfiguration()
    expectEmailAndPasswordConfiguration(config)
    expectEmailVerificationConfiguration(config)
    expectEmailOtpPluginConfiguration(emailOtpPlugin)
    expectOrganizationPluginConfiguration(organizationPlugin)

    await config.emailAndPassword.sendResetPassword({
      url: "http://localhost:3000/reset-password?token=reset-token",
      user: {
        email: "grace@example.com",
      },
    })

    expectPasswordResetEmailDispatch()

    const emailOtpOptions = requireValue(
      emailOtpPlugin.options,
      "Expected email OTP plugin options"
    )

    await emailOtpOptions.sendVerificationOTP({
      email: "grace@example.com",
      otp: "482913",
      type: "email-verification",
    })

    expectSignupVerificationOtpDispatch()
    expectLegacyEmailHooksToStayIdle()
  })

  it("logs password reset delivery errors without surfacing them", async () => {
    resetAuthMocks()

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
    resetAuthMocks()

    const consoleErrorMock = vi.spyOn(console, "error").mockReturnValue()
    sendSignupVerificationOtpEmailMock.mockRejectedValueOnce(
      new Error("signup otp failed")
    )

    try {
      const config = await loadAuthConfiguration()
      const emailOtpPlugin = requireEmailOtpPlugin(config)
      const emailOtpOptions = requireValue(
        emailOtpPlugin.options,
        "Expected email OTP plugin options"
      )

      await emailOtpOptions.sendVerificationOTP({
        email: "grace@example.com",
        otp: "482913",
        type: "sign-in",
      })
      await Promise.resolve()
      await Promise.resolve()

      expect(consoleErrorMock).toHaveBeenCalledTimes(1)
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
