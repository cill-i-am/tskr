const {
  createConsoleTransportMock,
  createEmailServiceMock,
  createResendTransportMock,
} = vi.hoisted(() => ({
  createConsoleTransportMock: vi.fn(() => "console-transport"),
  createEmailServiceMock: vi.fn(() => "email-service"),
  createResendTransportMock: vi.fn(() => "resend-transport"),
}))

vi.mock<typeof import("@workspace/email")>(import("@workspace/email"), () => ({
  createConsoleTransport: createConsoleTransportMock,
  createEmailService: createEmailServiceMock,
  createResendTransport: createResendTransportMock,
}))

import { createAuthenticationEmailService } from "./email-service.js"

describe(createAuthenticationEmailService, () => {
  beforeEach(() => {
    createConsoleTransportMock.mockClear()
    createEmailServiceMock.mockClear()
    createResendTransportMock.mockClear()
  })

  it("uses the console transport outside resend", () => {
    const result = createAuthenticationEmailService({
      betterAuthSecret: "test-secret",
      betterAuthUrl: "http://localhost:3002",
      emailFrom: "TSKR <noreply@tskr.app>",
      emailProvider: "console",
      emailReplyTo: "support@tskr.app",
      resendApiKey: undefined,
      trustedOrigins: ["http://localhost:3000"],
      webBaseUrl: "http://localhost:3000",
    })

    expect(createConsoleTransportMock).toHaveBeenCalledOnce()
    expect(createResendTransportMock).not.toHaveBeenCalled()
    expect(createEmailServiceMock).toHaveBeenCalledWith({
      appName: "tskr",
      from: "TSKR <noreply@tskr.app>",
      replyTo: "support@tskr.app",
      signupVerificationOtpExpiryText: "5 minutes",
      supportEmail: "support@tskr.app",
      transport: "console-transport",
    })
    expect(result).toBe("email-service")
  })

  it("uses the resend transport when configured", () => {
    createAuthenticationEmailService({
      betterAuthSecret: "test-secret",
      betterAuthUrl: "http://localhost:3002",
      emailFrom: "TSKR <noreply@tskr.app>",
      emailProvider: "resend",
      emailReplyTo: "support@tskr.app",
      resendApiKey: "resend-key",
      trustedOrigins: ["http://localhost:3000"],
      webBaseUrl: "http://localhost:3000",
    })

    expect(createConsoleTransportMock).not.toHaveBeenCalled()
    expect(createResendTransportMock).toHaveBeenCalledWith({
      apiKey: "resend-key",
    })
    expect(createEmailServiceMock).toHaveBeenCalledWith({
      appName: "tskr",
      from: "TSKR <noreply@tskr.app>",
      replyTo: "support@tskr.app",
      signupVerificationOtpExpiryText: "5 minutes",
      supportEmail: "support@tskr.app",
      transport: "resend-transport",
    })
  })

  it("requires a resend api key when resend is configured", () => {
    expect(() =>
      createAuthenticationEmailService({
        betterAuthSecret: "test-secret",
        betterAuthUrl: "http://localhost:3002",
        emailFrom: "TSKR <noreply@tskr.app>",
        emailProvider: "resend",
        emailReplyTo: "support@tskr.app",
        resendApiKey: undefined,
        trustedOrigins: ["http://localhost:3000"],
        webBaseUrl: "http://localhost:3000",
      })
    ).toThrow("RESEND_API_KEY must be set when EMAIL_PROVIDER is resend")
  })
})
