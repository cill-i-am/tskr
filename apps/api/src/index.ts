import { serve } from "@hono/node-server"

import { app } from "./app.js"

const DEFAULT_PORT = 3001
const port = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10)

serve({
  fetch: app.fetch,
  port,
})
