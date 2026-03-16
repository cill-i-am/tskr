type EmailRecipient = string | string[]

interface EmailMessage {
  from: string
  html: string
  replyTo?: string
  subject: string
  text: string
  to: EmailRecipient
}

interface EmailSendResult {
  id: string
}

interface EmailTransport {
  send(message: EmailMessage): Promise<EmailSendResult>
}

interface PasswordResetEmailInput {
  resetUrl: string
  to: string
}

interface SignupVerificationOtpEmailInput {
  code: string
  to: string
}

interface EmailVerificationEmailInput {
  to: string
  verificationUrl: string
}

interface ExistingUserSignUpNoticeEmailInput {
  signInUrl: string
  to: string
}

export type {
  EmailMessage,
  EmailRecipient,
  EmailSendResult,
  EmailTransport,
  EmailVerificationEmailInput,
  ExistingUserSignUpNoticeEmailInput,
  PasswordResetEmailInput,
  SignupVerificationOtpEmailInput,
}
