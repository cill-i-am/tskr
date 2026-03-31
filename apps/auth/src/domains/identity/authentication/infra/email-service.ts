import {
  createConsoleTransport,
  createEmailService,
  createResendTransport,
} from "@workspace/email"

import { captureE2eEmail } from "./e2e-email-capture.js"
import type { AuthenticationEnv } from "./env.js"

type AuthenticationEmailEnv = Pick<
  AuthenticationEnv,
  | "e2eEmailCaptureDir"
  | "emailFrom"
  | "emailProvider"
  | "emailReplyTo"
  | "resendApiKey"
>

const requireResendApiKey = (apiKey: string | undefined) => {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be set when EMAIL_PROVIDER is resend")
  }

  return apiKey
}

const createAuthenticationEmailService = (
  environment: AuthenticationEmailEnv
) => {
  const transport =
    environment.emailProvider === "resend"
      ? createResendTransport({
          apiKey: requireResendApiKey(environment.resendApiKey),
        })
      : createConsoleTransport()

  const baseService = createEmailService({
    appName: "tskr",
    from: environment.emailFrom,
    replyTo: environment.emailReplyTo,
    signupVerificationOtpExpiryText: "5 minutes",
    supportEmail: environment.emailReplyTo,
    transport,
  })

  if (!environment.e2eEmailCaptureDir) {
    return baseService
  }

  return {
    ...baseService,
    async sendEmailVerificationEmail(input) {
      const result = await baseService.sendEmailVerificationEmail(input)

      await captureE2eEmail({
        directory: environment.e2eEmailCaptureDir,
        payload: input,
        type: "email-verification",
      })

      return result
    },
    async sendExistingUserSignupNotice(input) {
      const result = await baseService.sendExistingUserSignupNotice(input)

      await captureE2eEmail({
        directory: environment.e2eEmailCaptureDir,
        payload: input,
        type: "existing-user-signup-notice",
      })

      return result
    },
    async sendPasswordResetEmail(input) {
      const result = await baseService.sendPasswordResetEmail(input)

      await captureE2eEmail({
        directory: environment.e2eEmailCaptureDir,
        payload: input,
        type: "password-reset",
      })

      return result
    },
    async sendSignupVerificationOtpEmail(input) {
      const result = await baseService.sendSignupVerificationOtpEmail(input)

      await captureE2eEmail({
        directory: environment.e2eEmailCaptureDir,
        payload: input,
        type: "signup-verification-otp",
      })

      return result
    },
    async sendWorkspaceInvitationEmail(input) {
      const result = await baseService.sendWorkspaceInvitationEmail(input)

      await captureE2eEmail({
        directory: environment.e2eEmailCaptureDir,
        payload: input,
        type: "workspace-invitation",
      })

      return result
    },
  }
}

export { createAuthenticationEmailService }
export type { AuthenticationEmailEnv }
