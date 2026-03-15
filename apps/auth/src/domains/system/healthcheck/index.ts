import { Hono } from "hono"

const upResponse = {
  ok: true,
} as const

const healthcheckRoutes = new Hono().get("/up", (context) =>
  context.json(upResponse)
)

export { healthcheckRoutes, upResponse }
