import {
  createConsoleTransport,
  createEmailService,
  createResendTransport,
} from "@workspace/email"

import type { AuthenticationEnv } from "./env.js"

type AuthenticationEmailEnv = Pick<
  AuthenticationEnv,
  "emailFrom" | "emailProvider" | "emailReplyTo" | "resendApiKey"
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

  return createEmailService({
    appName: "tskr",
    from: environment.emailFrom,
    replyTo: environment.emailReplyTo,
    signupVerificationOtpExpiryText: "5 minutes",
    supportEmail: environment.emailReplyTo,
    transport,
  })
}

export { createAuthenticationEmailService }
export type { AuthenticationEmailEnv }
