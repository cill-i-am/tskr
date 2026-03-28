import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"

import { readAuthServiceErrorMessage } from "./read-auth-service-error-message"

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
    throw new Error(await readAuthServiceErrorMessage(response))
  }
}

export { revokeWorkspaceInvite }
export type { RevokeWorkspaceInviteInput }
