import { Hono } from "hono"

import { healthcheckRoutes } from "./domains/system/healthcheck/index.js"

const app = new Hono()

const routes = app.route("/", healthcheckRoutes)

type AppType = typeof routes

export { app }
export type { AppType }
