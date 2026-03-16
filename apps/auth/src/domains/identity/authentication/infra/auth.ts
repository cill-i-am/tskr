import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { resolveDefaultCookieAttributes } from "./cookie-attributes.js"
import { database } from "./database.js"
import { createAuthenticationEmailService } from "./email-service.js"
import { parseAuthenticationEnv } from "./env.js"
import * as schema from "./schema.js"

const authenticationEnv = parseAuthenticationEnv()
const authenticationEmailService =
  createAuthenticationEmailService(authenticationEnv)
const existingUserSignInUrl = new URL(
  "/login",
  authenticationEnv.webBaseUrl
).toString()

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
    schema,
  }),
  emailAndPassword: {
    autoSignIn: true,
    enabled: true,
    onExistingUserSignUp: ({ user }) => {
      void authenticationEmailService
        .sendExistingUserSignupNotice({
          signInUrl: existingUserSignInUrl,
          to: user.email,
        })
        .catch((error) => {
          logEmailDeliveryFailure(
            "[auth:email] failed to send existing-user signup notice email",
            {
              error,
              recipient: user.email,
              signInUrl: existingUserSignInUrl,
            }
          )
        })
    },
    requireEmailVerification: false,
    sendResetPassword: async ({ url, user }) => {
      try {
        await authenticationEmailService.sendPasswordResetEmail({
          resetUrl: url,
          to: user.email,
        })
      } catch (error) {
        logEmailDeliveryFailure(
          "[auth:email] failed to send password reset email",
          {
            error,
            recipient: user.email,
            resetUrl: url,
          }
        )
        throw error
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: ({ url, user }) => {
      void authenticationEmailService
        .sendEmailVerificationEmail({
          to: user.email,
          verificationUrl: url,
        })
        .catch((error) => {
          logEmailDeliveryFailure(
            "[auth:email] failed to send verification email",
            {
              error,
              recipient: user.email,
              verificationUrl: url,
            }
          )
        })
    },
  },
  secret: authenticationEnv.betterAuthSecret,
  trustedOrigins: authenticationEnv.trustedOrigins,
})

function logEmailDeliveryFailure(
  message: string,
  details: Record<string, unknown>
) {
  console.error(message, details)
}

export { auth }
export { authenticationEnv }
