/* eslint-disable @typescript-eslint/consistent-type-imports, jest/valid-title */

import { createAuthenticationEmailService } from "./email-service.js"

const {
  consoleTransportMock,
  createConsoleTransportMock,
  createEmailServiceMock,
  createEmailServiceResultMock,
  createResendTransportMock,
  resendTransportMock,
} = vi.hoisted(() => {
  const consoleTransport = {
    send: vi.fn().mockResolvedValue({ id: "console-transport-id" }),
  }
  const resendTransport = {
    send: vi.fn().mockResolvedValue({ id: "resend-transport-id" }),
  }
  const createEmailServiceResult = {
    sendEmailVerificationEmail: vi.fn().mockResolvedValue({
      id: "verification-id",
    }),
    sendExistingUserSignupNotice: vi.fn().mockResolvedValue({
      id: "existing-user-id",
    }),
    sendPasswordResetEmail: vi.fn().mockResolvedValue({ id: "reset-id" }),
    sendSignupVerificationOtpEmail: vi.fn().mockResolvedValue({
      id: "signup-otp-id",
    }),
    sendWorkspaceInvitationEmail: vi.fn().mockResolvedValue({
      id: "workspace-invite-id",
    }),
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

vi.mock<typeof import("@workspace/email")>(import("@workspace/email"), () => ({
  createConsoleTransport: createConsoleTransportMock as never,
  createEmailService: createEmailServiceMock as never,
  createResendTransport: createResendTransportMock as never,
}))

const resetEmailServiceMocks = () => {
  createConsoleTransportMock.mockClear()
  createEmailServiceMock.mockClear()
  createResendTransportMock.mockClear()
}

describe(createAuthenticationEmailService, () => {
  it("uses the console transport outside resend", () => {
    resetEmailServiceMocks()

    const result = createAuthenticationEmailService({
      emailFrom: "TSKR <noreply@tskr.app>",
      emailProvider: "console",
      emailReplyTo: "support@tskr.app",
      resendApiKey: undefined,
    })

    expect(createConsoleTransportMock).toHaveBeenCalledOnce()
    expect(createResendTransportMock).not.toHaveBeenCalled()
    expect(createEmailServiceMock).toHaveBeenCalledWith({
      appName: "tskr",
      from: "TSKR <noreply@tskr.app>",
      replyTo: "support@tskr.app",
      signupVerificationOtpExpiryText: "5 minutes",
      supportEmail: "support@tskr.app",
      transport: consoleTransportMock,
    })
    expect(result).toBe(createEmailServiceResultMock)
  })

  it("uses the resend transport when configured", () => {
    resetEmailServiceMocks()

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
      signupVerificationOtpExpiryText: "5 minutes",
      supportEmail: "support@tskr.app",
      transport: resendTransportMock,
    })
  })

  it("requires a resend api key when resend is configured", () => {
    resetEmailServiceMocks()

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
