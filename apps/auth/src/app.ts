import { Hono } from "hono"

import { authenticationRoutes } from "./domains/identity/authentication/index.js"
import { healthcheckRoutes } from "./domains/system/healthcheck/index.js"

const app = new Hono()

const routes = app
  .route("/", healthcheckRoutes)
  .route("/", authenticationRoutes)

type AppType = typeof routes

export { app }
export type { AppType }
