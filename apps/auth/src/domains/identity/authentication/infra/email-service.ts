import {
  createConsoleTransport,
  createEmailService,
  createResendTransport,
} from "@workspace/email"

import type { AuthenticationEnv } from "./env.js"

const createAuthenticationEmailService = (environment: AuthenticationEnv) => {
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
    supportEmail: environment.emailReplyTo,
    transport,
  })
}

const requireResendApiKey = (apiKey: string | undefined) => {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be set when EMAIL_PROVIDER is resend")
  }

  return apiKey
}

export { createAuthenticationEmailService }
