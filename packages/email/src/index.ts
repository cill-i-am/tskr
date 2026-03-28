export {
  createEmailService,
  type EmailService,
  type EmailServiceConfig,
} from "./service.ts"
export {
  createConsoleTransport,
  type ConsoleTransportConfig,
} from "./transports/console.ts"
export {
  createResendTransport,
  type ResendTransportConfig,
} from "./transports/resend.ts"
export type {
  EmailMessage,
  EmailSendResult,
  EmailTransport,
  EmailVerificationEmailInput,
  ExistingUserSignUpNoticeEmailInput,
  PasswordResetEmailInput,
  SignupVerificationOtpEmailInput,
  WorkspaceInvitationEmailInput,
} from "./contracts.ts"
