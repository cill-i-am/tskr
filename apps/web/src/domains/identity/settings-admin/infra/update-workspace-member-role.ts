import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"
import { settingsAdminUpdateWorkspaceMemberRoleResponseSchema } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import type {
  SettingsAdminUpdateWorkspaceMemberRoleResponse,
  SettingsAdminWorkspaceRole,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"

interface UpdateWorkspaceMemberRoleInput {
  memberId: string
  role: SettingsAdminWorkspaceRole
  workspaceId: string
}

const updateWorkspaceMemberRole = async ({
  memberId,
  role,
  workspaceId,
}: UpdateWorkspaceMemberRoleInput): Promise<SettingsAdminUpdateWorkspaceMemberRoleResponse> => {
  const response = await fetchAuthService(
    `/api/workspaces/${workspaceId}/members/${memberId}/role`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      init: {
        body: JSON.stringify({
          role,
        }),
        method: "PATCH",
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
    const parsed =
      settingsAdminUpdateWorkspaceMemberRoleResponseSchema.safeParse(payload)

    if (!parsed.success) {
      throw new Error("Invalid workspace member role payload.")
    }

    return parsed.data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError("Malformed workspace member role JSON.", {
        cause: error,
      })
    }

    throw error
  }
}

export { updateWorkspaceMemberRole }
export type { UpdateWorkspaceMemberRoleInput }
