import {
  createConsoleTransport,
  createEmailService,
  createResendTransport,
} from "@workspace/email"
import type {
  ConsoleTransportConfig,
  EmailMessage,
  EmailSendResult,
  EmailService,
  EmailServiceConfig,
  EmailTransport,
  EmailVerificationEmailInput,
  ExistingUserSignUpNoticeEmailInput,
  PasswordResetEmailInput,
  ResendTransportConfig,
  SignupVerificationOtpEmailInput,
  WorkspaceInvitationEmailInput,
} from "@workspace/email"

const transport: EmailTransport = {
  send(message: EmailMessage): Promise<EmailSendResult> {
    return Promise.resolve({ id: `${message.subject}:${Date.now()}` })
  },
}

const config: EmailServiceConfig = {
  appName: "tskr",
  from: "TSKR <noreply@tskr.app>",
  replyTo: "support@tskr.app",
  signupVerificationOtpExpiryText: "5 minutes",
  supportEmail: "support@tskr.app",
  transport,
}

const service: EmailService = createEmailService(config)

const resetInput: PasswordResetEmailInput = {
  resetUrl: "https://app.tskr.test/reset-password?token=abc123",
  to: "ada@example.com",
}

const verifyInput: EmailVerificationEmailInput = {
  to: "grace@example.com",
  verificationUrl: "https://app.tskr.test/verify-email?token=v-123",
}

const noticeInput: ExistingUserSignUpNoticeEmailInput = {
  signInUrl: "https://app.tskr.test/sign-in",
  to: "linus@example.com",
}

const otpInput: SignupVerificationOtpEmailInput = {
  code: "123456",
  to: "alan@example.com",
}

const invitationInput: WorkspaceInvitationEmailInput = {
  acceptUrl: "https://app.tskr.test/invite/accept?token=inv-123",
  code: "INV-456",
  invitedByName: "Ada Lovelace",
  role: "member",
  to: "babbage@example.com",
  workspaceName: "Analytical Engine",
}

await Promise.all([
  service.sendPasswordResetEmail(resetInput),
  service.sendEmailVerificationEmail(verifyInput),
  service.sendExistingUserSignupNotice(noticeInput),
  service.sendSignupVerificationOtpEmail(otpInput),
  service.sendWorkspaceInvitationEmail(invitationInput),
])

const consoleConfig: ConsoleTransportConfig = {
  logger: console,
}
createConsoleTransport(consoleConfig)

const resendConfig: ResendTransportConfig = {
  apiKey: "resend-key",
  fetch: globalThis.fetch,
}
createResendTransport(resendConfig)
