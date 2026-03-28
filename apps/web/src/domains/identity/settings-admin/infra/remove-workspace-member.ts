import { fetchAuthService } from "@/domains/identity/authentication/infra/auth-service-client"

import { readAuthServiceErrorMessage } from "./read-auth-service-error-message"

interface RemoveWorkspaceMemberInput {
  memberId: string
  workspaceId: string
}

const removeWorkspaceMember = async ({
  memberId,
  workspaceId,
}: RemoveWorkspaceMemberInput): Promise<void> => {
  const response = await fetchAuthService(
    `/api/workspaces/${workspaceId}/members/${memberId}`,
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

export { removeWorkspaceMember }
export type { RemoveWorkspaceMemberInput }
