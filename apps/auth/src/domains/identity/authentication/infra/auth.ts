import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { authDatabaseSchema } from "@workspace/db"

import { resolveDefaultCookieAttributes } from "./cookie-attributes.js"
import { database } from "./database.js"
import { parseAuthenticationEnv } from "./env.js"
import { logPasswordResetLink } from "./password-reset-dev-stub.js"

const authenticationEnv = parseAuthenticationEnv()

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
    enabled: true,
    sendResetPassword: ({ token, url, user }) =>
      logPasswordResetLink({
        email: user.email,
        token,
        url,
      }),
  },
  secret: authenticationEnv.betterAuthSecret,
  trustedOrigins: authenticationEnv.trustedOrigins,
})

export { auth }
export { authenticationEnv }
