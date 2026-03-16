import type {
  EmailSendResult,
  EmailTransport,
  EmailVerificationEmailInput,
  ExistingUserSignUpNoticeEmailInput,
  PasswordResetEmailInput,
} from "./contracts.ts"
import { createEmailVerificationTemplate } from "./templates/email-verification.ts"
import { createExistingUserSignUpNoticeTemplate } from "./templates/existing-user-sign-up-notice.ts"
import { createPasswordResetTemplate } from "./templates/password-reset.ts"

type EmailServiceConfig = {
  appName: string
  from: string
  replyTo?: string
  supportEmail?: string
  transport: EmailTransport
}

type EmailService = {
  sendEmailVerificationEmail(
    input: EmailVerificationEmailInput
  ): Promise<EmailSendResult>
  sendExistingUserSignupNotice(
    input: ExistingUserSignUpNoticeEmailInput
  ): Promise<EmailSendResult>
  sendPasswordResetEmail(
    input: PasswordResetEmailInput
  ): Promise<EmailSendResult>
}

const createEmailService = (config: EmailServiceConfig): EmailService => {
  const sendTransactionalEmail = ({
    html,
    subject,
    text,
    to,
  }: {
    html: string
    subject: string
    text: string
    to: string
  }) =>
    config.transport.send({
      from: config.from,
      html,
      replyTo: config.replyTo,
      subject,
      text,
      to,
    })

  return {
    sendPasswordResetEmail: async ({ resetUrl, to }) => {
      const template = createPasswordResetTemplate({
        appName: config.appName,
        resetUrl,
      })
      return sendTransactionalEmail({ ...template, to })
    },
    sendEmailVerificationEmail: async ({ to, verificationUrl }) => {
      const template = createEmailVerificationTemplate({
        appName: config.appName,
        verificationUrl,
      })
      return sendTransactionalEmail({ ...template, to })
    },
    sendExistingUserSignupNotice: async ({ signInUrl, to }) => {
      const template = createExistingUserSignUpNoticeTemplate({
        appName: config.appName,
        signInUrl,
        supportEmail: config.supportEmail,
      })
      return sendTransactionalEmail({ ...template, to })
    },
  }
}

export { createEmailService }
export type { EmailService, EmailServiceConfig }
