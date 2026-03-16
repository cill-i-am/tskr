import { Hono } from "hono"

import { auth } from "./infra/auth.js"

const authenticationRoutes = new Hono().all("/api/auth/*", (context) =>
  auth.handler(context.req.raw)
)

export { authenticationRoutes }
