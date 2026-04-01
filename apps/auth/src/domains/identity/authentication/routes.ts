import { Hono } from "hono"
import { cors } from "hono/cors"

import { auth, authenticationEnv } from "./infra/auth.js"
import { pool } from "./infra/database.js"

const GENERIC_SIGNUP_ERROR = {
  message: "Unable to create your account.",
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const findSignupEmail = async (
  request: Request
): Promise<string | undefined> => {
  const contentType = request.headers.get("content-type") ?? ""

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { email?: unknown }

      return typeof body.email === "string"
        ? normalizeEmail(body.email)
        : undefined
    }

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData()
      const email = formData.get("email")

      return typeof email === "string" ? normalizeEmail(email) : undefined
    }
  } catch {
    return undefined
  }

  return undefined
}

const acquireDuplicateSignupLock = async (
  email: string,
  client: { query: typeof pool.query }
) => {
  await client.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [
    email,
  ])
}

const releaseDuplicateSignupLock = async (
  email: string,
  client: { query: typeof pool.query }
) => {
  await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [
    email,
  ])
}

const hasExistingUserWithEmail = async (
  email: string,
  client: { query: typeof pool.query }
): Promise<boolean> => {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM "auth"."user"
       WHERE email = $1
     ) AS exists`,
    [email]
  )

  return result.rows.at(0)?.exists ?? false
}

const shouldRejectDuplicateSignup = (request: Request): boolean => {
  const { pathname } = new URL(request.url)

  return request.method === "POST" && pathname === "/api/auth/sign-up/email"
}

const authenticationRoutes = new Hono()
  .use(
    "/api/auth/*",
    cors({
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      credentials: true,
      origin: authenticationEnv.trustedOrigins,
    })
  )
  .all("/api/auth/*", async (context) => {
    const request = context.req.raw

    if (shouldRejectDuplicateSignup(request)) {
      // Better Auth reads the request body itself, so keep a fresh clone for
      // the downstream handler after we inspect the original signup payload.
      const authRequest = request.clone()
      const email = await findSignupEmail(request)

      if (!email) {
        return auth.handler(authRequest)
      }

      const client = await pool.connect()

      try {
        await acquireDuplicateSignupLock(email, client)

        if (await hasExistingUserWithEmail(email, client)) {
          return context.json(GENERIC_SIGNUP_ERROR, 400)
        }

        return await auth.handler(authRequest)
      } finally {
        try {
          await releaseDuplicateSignupLock(email, client)
        } finally {
          client.release()
        }
      }
    }

    return auth.handler(request)
  })

export { authenticationRoutes }
