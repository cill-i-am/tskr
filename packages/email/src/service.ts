import type {
  EmailSendResult,
  EmailTransport,
  EmailVerificationEmailInput,
  ExistingUserSignUpNoticeEmailInput,
  PasswordResetEmailInput,
  SignupVerificationOtpEmailInput,
  WorkspaceInvitationEmailInput,
} from "./contracts.ts"
import { createEmailVerificationTemplate } from "./templates/email-verification.ts"
import { createExistingUserSignUpNoticeTemplate } from "./templates/existing-user-sign-up-notice.ts"
import { createPasswordResetTemplate } from "./templates/password-reset.ts"
import { createSignupVerificationOtpTemplate } from "./templates/signup-verification-otp.ts"
import { createWorkspaceInvitationTemplate } from "./templates/workspace-invitation.ts"

interface EmailServiceConfig {
  appName: string
  from: string
  replyTo?: string
  signupVerificationOtpExpiryText: string
  supportEmail?: string
  transport: EmailTransport
}

interface EmailService {
  sendEmailVerificationEmail(
    input: EmailVerificationEmailInput
  ): Promise<EmailSendResult>
  sendExistingUserSignupNotice(
    input: ExistingUserSignUpNoticeEmailInput
  ): Promise<EmailSendResult>
  sendPasswordResetEmail(
    input: PasswordResetEmailInput
  ): Promise<EmailSendResult>
  sendSignupVerificationOtpEmail(
    input: SignupVerificationOtpEmailInput
  ): Promise<EmailSendResult>
  sendWorkspaceInvitationEmail(
    input: WorkspaceInvitationEmailInput
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
    sendEmailVerificationEmail: ({ to, verificationUrl }) => {
      const template = createEmailVerificationTemplate({
        appName: config.appName,
        verificationUrl,
      })
      return sendTransactionalEmail({ ...template, to })
    },
    sendExistingUserSignupNotice: ({ signInUrl, to }) => {
      const template = createExistingUserSignUpNoticeTemplate({
        appName: config.appName,
        signInUrl,
        supportEmail: config.supportEmail,
      })
      return sendTransactionalEmail({ ...template, to })
    },
    sendPasswordResetEmail: ({ resetUrl, to }) => {
      const template = createPasswordResetTemplate({
        appName: config.appName,
        resetUrl,
      })
      return sendTransactionalEmail({ ...template, to })
    },
    sendSignupVerificationOtpEmail: ({ code, to }) => {
      const template = createSignupVerificationOtpTemplate({
        appName: config.appName,
        code,
        expiryText: config.signupVerificationOtpExpiryText,
      })
      return sendTransactionalEmail({ ...template, to })
    },
    sendWorkspaceInvitationEmail: ({
      acceptUrl,
      code,
      invitedByName,
      role,
      to,
      workspaceName,
    }) => {
      const template = createWorkspaceInvitationTemplate({
        acceptUrl,
        appName: config.appName,
        code,
        invitedByName,
        role,
        workspaceName,
      })
      return sendTransactionalEmail({ ...template, to })
    },
  }
}

export { createEmailService }
export type { EmailService, EmailServiceConfig }
