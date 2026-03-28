import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"
import { settingsAdminWorkspaceProfileSchema } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import type {
  SettingsAdminUpdateWorkspaceProfileRequest,
  SettingsAdminWorkspaceProfile,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"

import { readAuthServiceErrorMessage } from "./read-auth-service-error-message"

interface UpdateWorkspaceProfileInput extends SettingsAdminUpdateWorkspaceProfileRequest {
  workspaceId: string
}

const updateWorkspaceProfile = async ({
  logo,
  name,
  workspaceId,
}: UpdateWorkspaceProfileInput): Promise<SettingsAdminWorkspaceProfile> => {
  const response = await fetchAuthService(
    `/api/workspaces/${workspaceId}/profile`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      init: {
        body: JSON.stringify({
          logo,
          name,
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
    const parsed = settingsAdminWorkspaceProfileSchema.safeParse(payload)

    if (!parsed.success) {
      throw new Error("Invalid workspace profile payload.")
    }

    return parsed.data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError("Malformed workspace profile JSON.", {
        cause: error,
      })
    }

    throw error
  }
}

export { updateWorkspaceProfile }
export type { UpdateWorkspaceProfileInput }
