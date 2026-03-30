import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"
import { settingsAdminAccountProfileSchema } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import type { SettingsAdminAccountProfile } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"

import { readAuthServiceErrorMessage } from "./read-auth-service-error-message"

const getAccountProfile = async (): Promise<SettingsAdminAccountProfile> => {
  const response = await fetchAuthService("/api/account/profile")

  if (!response.ok) {
    throw new Error(await readAuthServiceErrorMessage(response))
  }

  try {
    const payload = await response.json()
    const parsed = settingsAdminAccountProfileSchema.safeParse(payload)

    if (!parsed.success) {
      throw new Error("Invalid account profile payload.")
    }

    return parsed.data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError("Malformed account profile JSON.", {
        cause: error,
      })
    }

    throw error
  }
}

export { getAccountProfile }
