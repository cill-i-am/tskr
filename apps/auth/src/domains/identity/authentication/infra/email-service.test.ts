import { createAuthenticationEmailService } from "./email-service.js"

const {
  consoleTransportMock,
  createConsoleTransportMock,
  createEmailServiceResultMock,
  createEmailServiceMock,
  createResendTransportMock,
  resendTransportMock,
} = vi.hoisted(() => {
  const consoleTransport = {
    send: vi.fn(() => Promise.resolve({ id: "console-transport-id" })),
  }
  const resendTransport = {
    send: vi.fn(() => Promise.resolve({ id: "resend-transport-id" })),
  }
  const createEmailServiceResult = {
    sendEmailVerificationEmail: vi.fn(() =>
      Promise.resolve({ id: "verification-id" })
    ),
    sendExistingUserSignupNotice: vi.fn(() =>
      Promise.resolve({
        id: "existing-user-id",
      })
    ),
    sendPasswordResetEmail: vi.fn(() => Promise.resolve({ id: "reset-id" })),
    sendSignupVerificationOtpEmail: vi.fn(() =>
      Promise.resolve({
        id: "signup-otp-id",
      })
    ),
  }

  return {
    consoleTransportMock: consoleTransport,
    createConsoleTransportMock: vi.fn(() => consoleTransport),
    createEmailServiceMock: vi.fn(() => createEmailServiceResult),
    createEmailServiceResultMock: createEmailServiceResult,
    createResendTransportMock: vi.fn(() => resendTransport),
    resendTransportMock: resendTransport,
  }
})

vi.mock<typeof import('@workspace/email')>(import('@workspace/email'), () => ({
  createConsoleTransport: createConsoleTransportMock as never,
  createEmailService: createEmailServiceMock as never,
  createResendTransport: createResendTransportMock as never,
}))

describe(createAuthenticationEmailService, () => {
  beforeEach(() => {
    createConsoleTransportMock.mockClear()
    createEmailServiceMock.mockClear()
    createResendTransportMock.mockClear()
  })

  it("uses the console transport outside resend", () => {
    const result = createAuthenticationEmailService({
      emailFrom: "TSKR <noreply@tskr.app>",
      emailProvider: "console",
      emailReplyTo: "support@tskr.app",
      resendApiKey: undefined,
    })

    expect(createConsoleTransportMock).toHaveBeenCalledTimes(1)
    expect(createResendTransportMock).not.toHaveBeenCalled()
    expect(createEmailServiceMock).toHaveBeenCalledWith({
      appName: "tskr",
      from: "TSKR <noreply@tskr.app>",
      replyTo: "support@tskr.app",
      supportEmail: "support@tskr.app",
      transport: consoleTransportMock,
    })
    expect(result).toBe(createEmailServiceResultMock)
  })

  it("uses the resend transport when configured", () => {
    createAuthenticationEmailService({
      emailFrom: "TSKR <noreply@tskr.app>",
      emailProvider: "resend",
      emailReplyTo: "support@tskr.app",
      resendApiKey: "resend-key",
    })

    expect(createConsoleTransportMock).not.toHaveBeenCalled()
    expect(createResendTransportMock).toHaveBeenCalledWith({
      apiKey: "resend-key",
    })
    expect(createEmailServiceMock).toHaveBeenCalledWith({
      appName: "tskr",
      from: "TSKR <noreply@tskr.app>",
      replyTo: "support@tskr.app",
      supportEmail: "support@tskr.app",
      transport: resendTransportMock,
    })
  })

  it("requires a resend api key when resend is configured", () => {
    expect(() =>
      createAuthenticationEmailService({
        emailFrom: "TSKR <noreply@tskr.app>",
        emailProvider: "resend",
        emailReplyTo: "support@tskr.app",
        resendApiKey: undefined,
      })
    ).toThrow("RESEND_API_KEY must be set when EMAIL_PROVIDER is resend")
  })
})
