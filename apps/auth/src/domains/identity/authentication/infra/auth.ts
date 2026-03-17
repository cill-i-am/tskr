import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { emailOTP } from "better-auth/plugins/email-otp"

import { authDatabaseSchema } from "@workspace/db"

import { resolveDefaultCookieAttributes } from "./cookie-attributes.js"
import { database } from "./database.js"
import { createAuthenticationEmailService } from "./email-service.js"
import { parseAuthenticationEnv } from "./env.js"

const authenticationEnv = parseAuthenticationEnv()
const authenticationEmailService =
  createAuthenticationEmailService(authenticationEnv)

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
    sendResetPassword: async ({ url, user }) => {
      // Better Auth treats reset delivery as a generic background side effect.
      void authenticationEmailService
        .sendPasswordResetEmail({
          resetUrl: url,
          to: user.email,
        })
        .catch((error) => {
          logEmailDeliveryFailure(
            "[auth:email] failed to send password reset email",
            {
              error,
              recipient: user.email,
              resetUrl: url,
            }
          )
        })
    },
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
      sendVerificationOTP: async ({ email, otp, type }) => {
        void authenticationEmailService
          .sendSignupVerificationOtpEmail({
            code: otp,
            to: email,
          })
          .catch((error) => {
            logEmailDeliveryFailure(
              "[auth:email] failed to send signup verification otp email",
              {
                error,
                otpType: type,
                recipient: email,
              }
            )
          })
      },
      storeOTP: "hashed",
    }),
  ],
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
