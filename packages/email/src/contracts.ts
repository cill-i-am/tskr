type EmailRecipient = string | string[]

type EmailMessage = {
  from: string
  html: string
  replyTo?: string
  subject: string
  text: string
  to: EmailRecipient
}

type EmailSendResult = {
  id: string
}

type EmailTransport = {
  send(message: EmailMessage): Promise<EmailSendResult>
}

type PasswordResetEmailInput = {
  resetUrl: string
  to: string
}

type SignupVerificationOtpEmailInput = {
  code: string
  to: string
}

type EmailVerificationEmailInput = {
  to: string
  verificationUrl: string
}

type ExistingUserSignUpNoticeEmailInput = {
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
