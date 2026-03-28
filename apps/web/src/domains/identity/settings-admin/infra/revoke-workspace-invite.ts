import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"

interface RevokeWorkspaceInviteInput {
  inviteId: string
  workspaceId: string
}

const revokeWorkspaceInvite = async ({
  inviteId,
  workspaceId,
}: RevokeWorkspaceInviteInput): Promise<void> => {
  const response = await fetchAuthService(
    `/api/workspaces/${workspaceId}/invites/${inviteId}`,
    {
      init: {
        method: "DELETE",
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
}

export { revokeWorkspaceInvite }
export type { RevokeWorkspaceInviteInput }
