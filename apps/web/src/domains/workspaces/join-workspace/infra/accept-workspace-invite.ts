import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"
import { readAuthServiceErrorMessage } from "@/domains/identity/settings-admin/infra/read-auth-service-error-message"
import { workspaceBootstrapSchema } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import type {
  JoinWorkspaceInviteCodeInput,
  JoinWorkspaceInviteTokenInput,
} from "@/domains/workspaces/join-workspace/contracts/join-workspace-contract"

type AcceptWorkspaceInviteInput =
  | JoinWorkspaceInviteCodeInput
  | JoinWorkspaceInviteTokenInput

const acceptWorkspaceInvite = async (
  input: AcceptWorkspaceInviteInput
): Promise<WorkspaceBootstrap> => {
  let body: string | null = null

  if ("code" in input) {
    body = JSON.stringify({
      code: input.code,
    })
  } else if ("token" in input) {
    body = JSON.stringify({
      token: input.token,
    })
  }

  if (!body) {
    throw new TypeError(
      "Join workspace invite input must include code or token."
    )
  }

  const response = await fetchAuthService("/api/workspaces/invites/accept", {
    headers: {
      "Content-Type": "application/json",
    },
    init: {
      body,
      method: "POST",
    },
  })

  if (!response.ok) {
    throw new Error(
      await readAuthServiceErrorMessage(response, {
        context: "Workspace invite acceptance",
      })
    )
  }

  try {
    const payload = await response.json()
    const parsed = workspaceBootstrapSchema.safeParse(payload)

    if (!parsed.success) {
      throw new Error("Invalid workspace invite acceptance payload.")
    }

    return parsed.data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError("Malformed workspace invite acceptance JSON.", {
        cause: error,
      })
    }

    throw error
  }
}

export { acceptWorkspaceInvite }
export type { AcceptWorkspaceInviteInput }
