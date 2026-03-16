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
} from "@workspace/email"

const transport: EmailTransport = {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    return { id: `${message.subject}:${Date.now()}` }
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

void service.sendPasswordResetEmail(resetInput)
void service.sendEmailVerificationEmail(verifyInput)
void service.sendExistingUserSignupNotice(noticeInput)

const consoleConfig: ConsoleTransportConfig = {
  logger: console,
}
void createConsoleTransport(consoleConfig)

const resendConfig: ResendTransportConfig = {
  apiKey: "resend-key",
  fetch: globalThis.fetch,
}
void createResendTransport(resendConfig)
