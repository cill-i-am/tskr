import { fetchApiService } from "@/domains/shared/infra/api-service-client"
import { Schema } from "effect"

import { syncContractsCreateWorkspaceInviteResponseSchema } from "@workspace/sync-contracts"
import type {
  SyncContractsCreateWorkspaceInvitePath,
  SyncContractsCreateWorkspaceInvitePayload,
  SyncContractsCreateWorkspaceInviteResponse,
} from "@workspace/sync-contracts"

const workspacePeopleSyncCommandsBasePath = "/api"
const unsupportedWorkspacePeopleSyncMutation = (_input: unknown): never => {
  throw new Error("Workspace people sync mutation is not implemented yet.")
}

const decodeJson = async <A, I>(
  response: Response,
  schema: Schema.Schema<A, I, never>,
  invalidMessage: string
) => {
  try {
    return Schema.decodeUnknownSync(schema)(await response.json())
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError(invalidMessage, {
        cause: error,
      })
    }

    throw error
  }
}

const readApiErrorMessage = async (response: Response) => {
  const body = await response.text()
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    if (!body) {
      return `API request failed with status ${response.status}.`
    }

    try {
      const payload = JSON.parse(body) as {
        message?: unknown
      }

      if (typeof payload.message === "string" && payload.message) {
        return payload.message
      }
    } catch {
      return `API request failed with status ${response.status}.`
    }

    return `API request failed with status ${response.status}.`
  }

  return body || `API request failed with status ${response.status}.`
}

interface CreateWorkspacePeopleSyncMutationClientOptions {
  apiBaseUrl?: string | undefined
}

const createWorkspacePeopleSyncMutationClient = ({
  apiBaseUrl,
}: CreateWorkspacePeopleSyncMutationClientOptions = {}) => {
  const createWorkspaceInvite = async ({
    workspaceId,
    ...payload
  }: SyncContractsCreateWorkspaceInvitePath &
    SyncContractsCreateWorkspaceInvitePayload): Promise<SyncContractsCreateWorkspaceInviteResponse> => {
    const response = await fetchApiService(
      `${workspacePeopleSyncCommandsBasePath}/workspaces/${workspaceId}/invites`,
      {
        apiBaseUrl,
        headers: {
          "Content-Type": "application/json",
        },
        init: {
          body: JSON.stringify(payload),
          method: "POST",
        },
      }
    )

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response))
    }

    return decodeJson(
      response,
      syncContractsCreateWorkspaceInviteResponseSchema,
      "Malformed workspace invite mutation JSON."
    )
  }

  return {
    createWorkspaceInvite,
    removeWorkspaceMember: unsupportedWorkspacePeopleSyncMutation,
    resendWorkspaceInvite: unsupportedWorkspacePeopleSyncMutation,
    revokeWorkspaceInvite: unsupportedWorkspacePeopleSyncMutation,
    updateWorkspaceMemberRole: unsupportedWorkspacePeopleSyncMutation,
  }
}

export {
  createWorkspacePeopleSyncMutationClient,
  workspacePeopleSyncCommandsBasePath,
}
