import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"
import { workspaceBootstrapSchema } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"

interface CreateWorkspaceInput {
  name: string
}

const createWorkspace = async ({
  name,
}: CreateWorkspaceInput): Promise<WorkspaceBootstrap> => {
  const response = await fetchAuthService("/api/workspaces", {
    headers: {
      "Content-Type": "application/json",
    },
    init: {
      body: JSON.stringify({
        name,
      }),
      method: "POST",
    },
  })

  if (!response.ok) {
    let message = `Auth service request failed with status ${response.status}.`

    try {
      const payload = (await response.json()) as {
        message?: string | undefined
      }

      if (payload.message) {
        ;({ message } = payload)
      }
    } catch {
      // Fall back to the generic message when the error payload is not JSON.
    }

    throw new Error(message)
  }

  try {
    const payload = await response.json()
    const parsed = workspaceBootstrapSchema.safeParse(payload)

    if (!parsed.success) {
      throw new Error("Invalid workspace creation payload.")
    }

    return parsed.data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError("Malformed workspace creation JSON.", {
        cause: error,
      })
    }

    throw error
  }
}

export { createWorkspace }
export type { CreateWorkspaceInput }
