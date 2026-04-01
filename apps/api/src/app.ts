import { Hono } from "hono"

import { healthcheckRoutes } from "./domains/system/healthcheck/index.js"
import {
  createWorkspaceSyncRoutes,
  createWorkspaceSyncService,
} from "./domains/workspace-sync/index.js"
import type { WorkspaceSyncService } from "./domains/workspace-sync/index.js"

const createApp = ({
  workspaceSyncService,
}: {
  workspaceSyncService?: WorkspaceSyncService
} = {}) => {
  const app = new Hono()

  return app.route("/", healthcheckRoutes).route(
    "/",
    createWorkspaceSyncRoutes({
      service: workspaceSyncService ?? createWorkspaceSyncService(),
    })
  )
}

const app = createApp()

const routes = app

type AppType = typeof routes

export { app }
export { createApp }
export type { AppType }
