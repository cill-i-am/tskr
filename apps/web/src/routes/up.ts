import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/up")({
  server: {
    handlers: {
      GET: () => {
        return Response.json({ ok: true })
      },
    },
  },
})
