import { Hono } from "hono"

import { authenticationRoutes } from "./domains/identity/authentication/index.js"
import {
  authenticationEnv,
  auth,
} from "./domains/identity/authentication/infra/auth.js"
import { pool } from "./domains/identity/authentication/infra/database.js"
import {
  buildWorkspaceInviteAcceptUrl,
  verifyWorkspaceInviteToken,
} from "./domains/identity/authentication/infra/workspace-invite-token.js"
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
  buildWorkspaceInviteAcceptUrl: (code) =>
    buildWorkspaceInviteAcceptUrl({
      code,
      secret: authenticationEnv.betterAuthSecret,
      webBaseUrl: authenticationEnv.webBaseUrl,
    }),
  repository: workspaceRepository,
  verifyWorkspaceInviteToken: (token) =>
    verifyWorkspaceInviteToken(token, authenticationEnv.betterAuthSecret),
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
