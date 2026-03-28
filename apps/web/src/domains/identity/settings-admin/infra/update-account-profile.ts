import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"
import { settingsAdminAccountProfileSchema } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import type {
  SettingsAdminAccountProfile,
  SettingsAdminUpdateAccountProfileRequest,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"

const updateAccountProfile = async ({
  image,
  name,
}: SettingsAdminUpdateAccountProfileRequest): Promise<SettingsAdminAccountProfile> => {
  const response = await fetchAuthService("/api/account/profile", {
    headers: {
      "Content-Type": "application/json",
    },
    init: {
      body: JSON.stringify({
        image,
        name,
      }),
      method: "PATCH",
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

export { updateAccountProfile }
