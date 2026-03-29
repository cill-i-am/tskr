import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"
import { settingsAdminUpdateWorkspaceMemberRoleResponseSchema } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import type {
  SettingsAdminUpdateWorkspaceMemberRoleResponse,
  SettingsAdminWorkspaceRole,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"

import { readAuthServiceErrorMessage } from "./read-auth-service-error-message"

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
    throw new Error(await readAuthServiceErrorMessage(response))
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
