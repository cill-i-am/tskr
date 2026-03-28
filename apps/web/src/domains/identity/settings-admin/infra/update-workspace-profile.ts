import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"
import { settingsAdminWorkspaceProfileSchema } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import type {
  SettingsAdminUpdateWorkspaceProfileRequest,
  SettingsAdminWorkspaceProfile,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"

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
