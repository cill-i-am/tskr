import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { resolveDefaultCookieAttributes } from "./cookie-attributes.js"
import { database } from "./database.js"
import { createAuthenticationEmailService } from "./email-service.js"
import { parseAuthenticationEnv } from "./env.js"
import type { AuthenticationEnv } from "./env.js"
import * as schema from "./schema.js"

const authenticationEnv = parseAuthenticationEnv()
const authenticationEmailService =
  createAuthenticationEmailService(authenticationEnv)
const existingUserSignInUrl = resolveExistingUserSignInUrl(authenticationEnv)

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
    enabled: true,
    onExistingUserSignUp: ({ user }) => {
      void authenticationEmailService.sendExistingUserSignUpNotice({
        signInUrl: existingUserSignInUrl,
        to: user.email,
      })
    },
    requireEmailVerification: false,
    sendResetPassword: ({ url, user }) => {
      void authenticationEmailService.sendPasswordReset({
        resetUrl: url,
        to: user.email,
      })
    },
  },
  emailVerification: {
    sendVerificationEmail: ({ url, user }) => {
      void authenticationEmailService.sendEmailVerification({
        to: user.email,
        verificationUrl: url,
      })
    },
  },
  secret: authenticationEnv.betterAuthSecret,
  trustedOrigins: authenticationEnv.trustedOrigins,
})

function resolveExistingUserSignInUrl(environment: AuthenticationEnv) {
  const preferredOrigin =
    environment.trustedOrigins.find((origin) => !origin.includes("localhost")) ??
    environment.trustedOrigins.at(0) ??
    environment.betterAuthUrl

  return new URL("/login", preferredOrigin).toString()
}

export { auth }
export { authenticationEnv }
