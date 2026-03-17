import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

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
    schema: authDatabaseSchema,
  }),
  emailAndPassword: {
    autoSignIn: true,
    enabled: true,
    onExistingUserSignUp: ({ user }) =>
      // Keep notification delivery off the critical auth path.
      runEmailSideEffect(
        () =>
          authenticationEmailService.sendExistingUserSignupNotice({
            signInUrl: existingUserSignInUrl,
            to: user.email,
          }),
        "[auth:email] failed to send existing-user signup notice email",
        {
          recipient: user.email,
          signInUrl: existingUserSignInUrl,
        }
      ),
    requireEmailVerification: false,
    sendResetPassword: ({ url, user }) =>
      // Better Auth treats reset delivery as a generic background side effect.
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
    sendOnSignUp: true,
    sendVerificationEmail: ({ url, user }) =>
      // Better Auth supplies the auth-hosted verify URL, including any callbackURL from signup.
      runEmailSideEffect(
        () =>
          authenticationEmailService.sendEmailVerificationEmail({
            to: user.email,
            verificationUrl: url,
          }),
        "[auth:email] failed to send verification email",
        {
          recipient: user.email,
          verificationUrl: url,
        }
      ),
  },
  secret: authenticationEnv.betterAuthSecret,
  trustedOrigins: authenticationEnv.trustedOrigins,
})

export { auth }
export { authenticationEnv }
