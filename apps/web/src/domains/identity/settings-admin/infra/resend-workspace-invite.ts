import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"

import { readAuthServiceErrorMessage } from "./read-auth-service-error-message"

interface ResendWorkspaceInviteInput {
  inviteId: string
  workspaceId: string
}

const resendWorkspaceInvite = async ({
  inviteId,
  workspaceId,
}: ResendWorkspaceInviteInput): Promise<void> => {
  const response = await fetchAuthService(
    `/api/workspaces/${workspaceId}/invites/${inviteId}/resend`,
    {
      init: {
        method: "POST",
      },
    }
  )

  if (!response.ok) {
    throw new Error(await readAuthServiceErrorMessage(response))
  }
}

export { resendWorkspaceInvite }
export type { ResendWorkspaceInviteInput }
