import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"
import { workspaceBootstrapSchema } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"

interface GetWorkspaceBootstrapOptions {
  init?: RequestInit | undefined
  request?: Request | undefined
}

const getWorkspaceBootstrap = async ({
  init,
  request,
}: GetWorkspaceBootstrapOptions = {}): Promise<WorkspaceBootstrap | null> => {
  const response = await fetchAuthService("/api/workspaces/bootstrap", {
    init,
    request,
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error(
      `Auth service request failed with status ${response.status}.`
    )
  }

  try {
    const payload = await response.json()
    const parsed = workspaceBootstrapSchema.safeParse(payload)

    if (!parsed.success) {
      throw new Error("Invalid workspace bootstrap payload.")
    }

    return parsed.data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError("Malformed workspace bootstrap JSON.", {
        cause: error,
      })
    }

    throw error
  }
}

export { getWorkspaceBootstrap }
