import { createFileRoute } from "@tanstack/react-router"
import type {} from "@tanstack/react-start"

export const Route = createFileRoute("/up")({
  server: {
    handlers: {
      GET: () => Response.json({ ok: true }),
    },
  },
})
