import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"
import { settingsAdminSnapshotSchema } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import type { SettingsAdminSnapshot } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"

import { readAuthServiceErrorMessage } from "./read-auth-service-error-message"

interface GetSettingsSnapshotInput {
  workspaceId: string
}

const getSettingsSnapshot = async ({
  workspaceId,
}: GetSettingsSnapshotInput): Promise<SettingsAdminSnapshot> => {
  const response = await fetchAuthService(
    `/api/workspaces/${workspaceId}/settings`
  )

  if (!response.ok) {
    throw new Error(await readAuthServiceErrorMessage(response))
  }

  try {
    const payload = await response.json()
    const parsed = settingsAdminSnapshotSchema.safeParse(payload)

    if (!parsed.success) {
      throw new Error("Invalid settings snapshot payload.")
    }

    return parsed.data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError("Malformed settings snapshot JSON.", {
        cause: error,
      })
    }

    throw error
  }
}

export { getSettingsSnapshot }
export type { GetSettingsSnapshotInput }
