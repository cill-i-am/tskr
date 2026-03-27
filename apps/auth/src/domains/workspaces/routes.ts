import { Hono } from "hono"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"

import { normalizeWorkspaceName } from "./workspace-service.js"
import type { createWorkspaceService } from "./workspace-service.js"

interface CreateWorkspaceRoutesOptions {
  service: ReturnType<typeof createWorkspaceService>
  trustedOrigins: string[]
}

const readJsonBody = async <Body>(request: Request): Promise<Body | null> => {
  try {
    return (await request.json()) as Body
  } catch {
    return null
  }
}

const requireWorkspaceName = async (request: Request) => {
  const body = await readJsonBody<{ name?: unknown }>(request)
  const name =
    typeof body?.name === "string" ? normalizeWorkspaceName(body.name) : ""

  if (!name) {
    throw new HTTPException(400, {
      message: "Workspace name is required.",
    })
  }

  return name
}

const requireWorkspaceId = async (request: Request) => {
  const body = await readJsonBody<{ workspaceId?: unknown }>(request)

  if (body?.workspaceId === null) {
    return null
  }

  if (typeof body?.workspaceId === "string") {
    return body.workspaceId
  }

  throw new HTTPException(400, {
    message: "workspaceId must be a string or null.",
  })
}

const createWorkspaceRoutes = ({
  service,
  trustedOrigins,
}: CreateWorkspaceRoutesOptions) =>
  new Hono()
    .use(
      "/api/workspaces/*",
      cors({
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
        credentials: true,
        origin: trustedOrigins,
      })
    )
    .get("/api/workspaces/bootstrap", async (context) => {
      const bootstrap = await service.getWorkspaceBootstrap(
        context.req.raw.headers
      )

      if (!bootstrap) {
        throw new HTTPException(401, {
          message: "Authentication is required.",
        })
      }

      return context.json(bootstrap)
    })
    .post("/api/workspaces", async (context) => {
      const bootstrap = await service.getWorkspaceBootstrap(
        context.req.raw.headers
      )

      if (!bootstrap) {
        throw new HTTPException(401, {
          message: "Authentication is required.",
        })
      }

      const name = await requireWorkspaceName(context.req.raw)

      return context.json(
        await service.createWorkspace(context.req.raw.headers, name)
      )
    })
    .put("/api/workspaces/active", async (context) => {
      const workspaceId = await requireWorkspaceId(context.req.raw)
      const result = await service.updateActiveWorkspace(
        context.req.raw.headers,
        workspaceId
      )

      if (!result) {
        throw new HTTPException(401, {
          message: "Authentication is required.",
        })
      }

      if (result.status === "forbidden") {
        throw new HTTPException(403, {
          message: "You are not a member of that workspace.",
        })
      }

      return context.json(result.bootstrap)
    })

export { createWorkspaceRoutes }
