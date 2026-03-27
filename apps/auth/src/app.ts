import { Hono } from "hono"

import { authenticationRoutes } from "./domains/identity/authentication/index.js"
import {
  authenticationEnv,
  auth,
} from "./domains/identity/authentication/infra/auth.js"
import { pool } from "./domains/identity/authentication/infra/database.js"
import { healthcheckRoutes } from "./domains/system/healthcheck/index.js"
import {
  createWorkspaceRepository,
  createWorkspaceRoutes,
  createWorkspaceService,
} from "./domains/workspaces/index.js"

const app = new Hono()
const workspaceRepository = createWorkspaceRepository(pool)
const workspaceService = createWorkspaceService({
  auth,
  repository: workspaceRepository,
})
const workspaceRoutes = createWorkspaceRoutes({
  service: workspaceService,
  trustedOrigins: authenticationEnv.trustedOrigins,
})

const routes = app
  .route("/", healthcheckRoutes)
  .route("/", workspaceRoutes)
  .route("/", authenticationRoutes)

type AppType = typeof routes

export { app }
export type { AppType }
