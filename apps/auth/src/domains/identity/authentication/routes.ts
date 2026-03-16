import { Hono } from "hono"
import { cors } from "hono/cors"

import { auth, authenticationEnv } from "./infra/auth.js"

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
  .all("/api/auth/*", (context) => auth.handler(context.req.raw))

export { authenticationRoutes }
