import { Hono } from "hono"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"

import { isWorkspaceRole } from "./authorization-policy.js"
import type {
  AcceptWorkspaceInviteRequest,
  CreateWorkspaceInviteRequest,
  UpdateAccountProfileRequest,
  UpdateWorkspaceMemberRoleRequest,
  UpdateWorkspaceProfileRequest,
} from "./contracts.js"
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

const requireInviteInput = async (request: Request) => {
  const body =
    await readJsonBody<
      Partial<Record<keyof CreateWorkspaceInviteRequest, unknown>>
    >(request)
  const email = typeof body?.email === "string" ? body.email.trim() : ""

  if (!email) {
    throw new HTTPException(400, {
      message: "Invite email is required.",
    })
  }

  if (typeof body?.role !== "string" || !isWorkspaceRole(body.role)) {
    throw new HTTPException(400, {
      message: "role must be one of: owner, admin, dispatcher, field_worker.",
    })
  }

  return {
    email,
    role: body.role,
  }
}

const requireAcceptInviteInput = async (request: Request) => {
  const body =
    await readJsonBody<
      Partial<Record<keyof AcceptWorkspaceInviteRequest, unknown>>
    >(request)
  const code = typeof body?.code === "string" ? body.code.trim() : undefined
  const token = typeof body?.token === "string" ? body.token.trim() : undefined

  if ((!code && !token) || (code && token)) {
    throw new HTTPException(400, {
      message: "Provide exactly one of code or token.",
    })
  }

  return {
    code,
    token,
  }
}

const requireRoleUpdate = async (request: Request) => {
  const body =
    await readJsonBody<
      Partial<Record<keyof UpdateWorkspaceMemberRoleRequest, unknown>>
    >(request)

  if (typeof body?.role !== "string" || !isWorkspaceRole(body.role)) {
    throw new HTTPException(400, {
      message: "role must be one of: owner, admin, dispatcher, field_worker.",
    })
  }

  return {
    role: body.role,
  }
}

const requireAccountProfileUpdate = async (request: Request) => {
  const body =
    await readJsonBody<
      Partial<Record<keyof UpdateAccountProfileRequest, unknown>>
    >(request)

  if (typeof body?.name !== "string") {
    throw new HTTPException(400, {
      message: "name must be a string.",
    })
  }

  if (
    body?.image !== undefined &&
    body?.image !== null &&
    typeof body.image !== "string"
  ) {
    throw new HTTPException(400, {
      message: "image must be a string or null.",
    })
  }

  const image =
    typeof body?.image === "string" || body?.image === null
      ? body.image
      : undefined

  return {
    image,
    name: body.name,
  }
}

const requireWorkspaceProfileUpdate = async (request: Request) => {
  const body =
    await readJsonBody<
      Partial<Record<keyof UpdateWorkspaceProfileRequest, unknown>>
    >(request)

  if (typeof body?.name !== "string") {
    throw new HTTPException(400, {
      message: "name must be a string.",
    })
  }

  if (
    body?.logo !== undefined &&
    body?.logo !== null &&
    typeof body.logo !== "string"
  ) {
    throw new HTTPException(400, {
      message: "logo must be a string or null.",
    })
  }

  const logo =
    typeof body?.logo === "string" || body?.logo === null
      ? body.logo
      : undefined

  return {
    logo,
    name: body.name,
  }
}

const createWorkspaceRoutes = ({
  service,
  trustedOrigins,
}: CreateWorkspaceRoutesOptions) =>
  new Hono()
    .use(
      "/api/account/*",
      cors({
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["DELETE", "GET", "PATCH", "POST", "PUT", "OPTIONS"],
        credentials: true,
        origin: trustedOrigins,
      })
    )
    .use(
      "/api/workspaces/*",
      cors({
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["DELETE", "GET", "PATCH", "POST", "PUT", "OPTIONS"],
        credentials: true,
        origin: trustedOrigins,
      })
    )
    .get("/api/account/profile", async (context) =>
      context.json(await service.getAccountProfile(context.req.raw.headers))
    )
    .patch("/api/account/profile", async (context) =>
      context.json(
        await service.updateAccountProfile(
          context.req.raw.headers,
          await requireAccountProfileUpdate(context.req.raw)
        )
      )
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
    .get("/api/workspaces/:workspaceId/settings", async (context) =>
      context.json(
        await service.getWorkspaceSettings(
          context.req.raw.headers,
          context.req.param("workspaceId")
        )
      )
    )
    .patch("/api/workspaces/:workspaceId/profile", async (context) =>
      context.json(
        await service.updateWorkspaceProfile(
          context.req.raw.headers,
          context.req.param("workspaceId"),
          await requireWorkspaceProfileUpdate(context.req.raw)
        )
      )
    )
    .post("/api/workspaces/:workspaceId/invites", async (context) => {
      const { email, role } = await requireInviteInput(context.req.raw)
      const invite = await service.createInvite(
        context.req.raw.headers,
        context.req.param("workspaceId"),
        email,
        role
      )

      return context.json(invite)
    })
    .post(
      "/api/workspaces/:workspaceId/invites/:inviteId/resend",
      async (context) => {
        await service.resendInvite(
          context.req.raw.headers,
          context.req.param("workspaceId"),
          context.req.param("inviteId")
        )

        return new Response(null, {
          status: 204,
        })
      }
    )
    .delete(
      "/api/workspaces/:workspaceId/invites/:inviteId",
      async (context) => {
        await service.revokeInvite(
          context.req.raw.headers,
          context.req.param("workspaceId"),
          context.req.param("inviteId")
        )

        return new Response(null, {
          status: 204,
        })
      }
    )
    .post("/api/workspaces/invites/accept", async (context) =>
      context.json(
        await service.acceptInvite(
          context.req.raw.headers,
          await requireAcceptInviteInput(context.req.raw)
        )
      )
    )
    .patch(
      "/api/workspaces/:workspaceId/members/:memberId/role",
      async (context) => {
        const { role } = await requireRoleUpdate(context.req.raw)

        return context.json(
          await service.updateMemberRole(
            context.req.raw.headers,
            context.req.param("workspaceId"),
            context.req.param("memberId"),
            role
          )
        )
      }
    )
    .delete(
      "/api/workspaces/:workspaceId/members/:memberId",
      async (context) => {
        await service.removeMember(
          context.req.raw.headers,
          context.req.param("workspaceId"),
          context.req.param("memberId")
        )

        return new Response(null, {
          status: 204,
        })
      }
    )

export { createWorkspaceRoutes }
