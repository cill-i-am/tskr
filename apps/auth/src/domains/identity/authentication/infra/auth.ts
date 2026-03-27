import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { emailOTP } from "better-auth/plugins/email-otp"
import { organization } from "better-auth/plugins/organization"

import { authDatabaseSchema } from "@workspace/db"

import { resolveDefaultCookieAttributes } from "./cookie-attributes.js"
import { database } from "./database.js"
import { createAuthenticationEmailService } from "./email-service.js"
import { parseAuthenticationEnv } from "./env.js"

const authenticationEnv = parseAuthenticationEnv()
const authenticationEmailService =
  createAuthenticationEmailService(authenticationEnv)

const logEmailDeliveryFailure = (
  message: string,
  details: Record<string, unknown>
) => {
  console.error(message, details)
}

const runEmailSideEffect = (
  send: () => Promise<unknown>,
  message: string,
  details: Record<string, unknown>
) => {
  queueMicrotask(async () => {
    try {
      await send()
    } catch (error) {
      logEmailDeliveryFailure(message, {
        ...details,
        error,
      })
    }
  })

  return Promise.resolve()
}

const auth = betterAuth({
  advanced: {
    defaultCookieAttributes: resolveDefaultCookieAttributes(
      authenticationEnv.betterAuthUrl
    ),
  },
  appName: "tskr",
  basePath: "/api/auth",
  baseURL: authenticationEnv.betterAuthUrl,
  database: drizzleAdapter(database, {
    provider: "pg",
    schema: authDatabaseSchema,
  }),
  emailAndPassword: {
    autoSignIn: false,
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: ({ url, user }) =>
      runEmailSideEffect(
        () =>
          authenticationEmailService.sendPasswordResetEmail({
            resetUrl: url,
            to: user.email,
          }),
        "[auth:email] failed to send password reset email",
        {
          recipient: user.email,
          resetUrl: url,
        }
      ),
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignIn: true,
    sendOnSignUp: true,
  },
  plugins: [
    emailOTP({
      allowedAttempts: 3,
      expiresIn: 300,
      otpLength: 6,
      overrideDefaultEmailVerification: true,
      sendVerificationOTP: ({ email, otp, type }) =>
        runEmailSideEffect(
          () =>
            authenticationEmailService.sendSignupVerificationOtpEmail({
              code: otp,
              to: email,
            }),
          "[auth:email] failed to send signup verification otp email",
          {
            otpType: type,
            recipient: email,
          }
        ),
      storeOTP: "hashed",
    }),
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
    }),
  ],
  secret: authenticationEnv.betterAuthSecret,
  trustedOrigins: authenticationEnv.trustedOrigins,
})

export { auth }
export { authenticationEnv }
