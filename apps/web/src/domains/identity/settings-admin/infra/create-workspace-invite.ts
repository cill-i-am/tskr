import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"
import { createWorkspaceInviteResponseSchema } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import type {
  CreateWorkspaceInviteResponse,
  SettingsAdminCreateWorkspaceInviteRequest,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"

interface CreateWorkspaceInviteInput extends SettingsAdminCreateWorkspaceInviteRequest {
  workspaceId: string
}

const createWorkspaceInvite = async ({
  email,
  role,
  workspaceId,
}: CreateWorkspaceInviteInput): Promise<CreateWorkspaceInviteResponse> => {
  const response = await fetchAuthService(
    `/api/workspaces/${workspaceId}/invites`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      init: {
        body: JSON.stringify({
          email,
          role,
        }),
        method: "POST",
      },
    }
  )

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
    const parsed = createWorkspaceInviteResponseSchema.safeParse(payload)

    if (!parsed.success) {
      throw new Error("Invalid workspace invite payload.")
    }

    return parsed.data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError("Malformed workspace invite JSON.", {
        cause: error,
      })
    }

    throw error
  }
}

export { createWorkspaceInvite }
export type { CreateWorkspaceInviteInput }
