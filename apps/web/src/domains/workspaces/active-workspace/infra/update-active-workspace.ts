import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"
import { readAuthServiceErrorMessage } from "@/domains/identity/authentication/infra/read-auth-service-error-message"
import { workspaceBootstrapSchema } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"

interface UpdateActiveWorkspaceInput {
  workspaceId: string | null
}

const updateActiveWorkspace = async ({
  workspaceId,
}: UpdateActiveWorkspaceInput): Promise<WorkspaceBootstrap> => {
  const response = await fetchAuthService("/api/workspaces/active", {
    headers: {
      "Content-Type": "application/json",
    },
    init: {
      body: JSON.stringify({
        workspaceId,
      }),
      method: "PUT",
    },
  })

  if (!response.ok) {
    throw new Error(
      await readAuthServiceErrorMessage(response, {
        context: "Active workspace update",
      })
    )
  }

  try {
    const payload = await response.json()
    const parsed = workspaceBootstrapSchema.safeParse(payload)

    if (!parsed.success) {
      throw new Error("Invalid active workspace payload.")
    }

    return parsed.data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError("Malformed active workspace JSON.", {
        cause: error,
      })
    }

    throw error
  }
}

export { updateActiveWorkspace }
export type { UpdateActiveWorkspaceInput }
