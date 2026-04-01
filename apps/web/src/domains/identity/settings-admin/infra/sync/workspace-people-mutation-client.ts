import { fetchApiService } from "@/domains/shared/infra/api-service-client"
import { Schema } from "effect"

import {
  syncContractsCreateWorkspaceInviteResponseSchema,
  syncContractsRemoveWorkspaceMemberResponseSchema,
  syncContractsResendWorkspaceInviteResponseSchema,
  syncContractsRevokeWorkspaceInviteResponseSchema,
  syncContractsUpdateWorkspaceMemberRoleResponseSchema,
} from "@workspace/sync-contracts"
import type {
  SyncContractsCreateWorkspaceInvitePath,
  SyncContractsCreateWorkspaceInvitePayload,
  SyncContractsCreateWorkspaceInviteResponse,
  SyncContractsRemoveWorkspaceMemberPath,
  SyncContractsRemoveWorkspaceMemberResponse,
  SyncContractsResendWorkspaceInvitePath,
  SyncContractsResendWorkspaceInviteResponse,
  SyncContractsRevokeWorkspaceInvitePath,
  SyncContractsRevokeWorkspaceInviteResponse,
  SyncContractsUpdateWorkspaceMemberRolePath,
  SyncContractsUpdateWorkspaceMemberRolePayload,
  SyncContractsUpdateWorkspaceMemberRoleResponse,
} from "@workspace/sync-contracts"

const workspacePeopleSyncCommandsBasePath = "/api"

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

const sendWorkspacePeopleMutation = async <A, I>({
  apiBaseUrl,
  body,
  method,
  path,
  responseSchema,
  invalidMessage,
}: {
  apiBaseUrl?: string | undefined
  body?: BodyInit | undefined
  invalidMessage: string
  method: "DELETE" | "PATCH" | "POST"
  path: string
  responseSchema: Schema.Schema<A, I, never>
}): Promise<A> => {
  const response = await fetchApiService(
    `${workspacePeopleSyncCommandsBasePath}${path}`,
    {
      apiBaseUrl,
      headers: body
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
      init: {
        body,
        method,
      },
    }
  )

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response))
  }

  return decodeJson(response, responseSchema, invalidMessage)
}

const createWorkspacePeopleSyncMutationClient = ({
  apiBaseUrl,
}: CreateWorkspacePeopleSyncMutationClientOptions = {}) => {
  const createWorkspaceInvite = ({
    workspaceId,
    ...payload
  }: SyncContractsCreateWorkspaceInvitePath &
    SyncContractsCreateWorkspaceInvitePayload): Promise<SyncContractsCreateWorkspaceInviteResponse> =>
    sendWorkspacePeopleMutation({
      apiBaseUrl,
      body: JSON.stringify(payload),
      invalidMessage: "Malformed workspace invite mutation JSON.",
      method: "POST",
      path: `/workspaces/${workspaceId}/invites`,
      responseSchema: syncContractsCreateWorkspaceInviteResponseSchema,
    })

  const resendWorkspaceInvite = ({
    inviteId,
    workspaceId,
  }: SyncContractsResendWorkspaceInvitePath): Promise<SyncContractsResendWorkspaceInviteResponse> =>
    sendWorkspacePeopleMutation({
      apiBaseUrl,
      invalidMessage: "Malformed workspace invite resend JSON.",
      method: "POST",
      path: `/workspaces/${workspaceId}/invites/${inviteId}/resend`,
      responseSchema: syncContractsResendWorkspaceInviteResponseSchema,
    })

  const revokeWorkspaceInvite = ({
    inviteId,
    workspaceId,
  }: SyncContractsRevokeWorkspaceInvitePath): Promise<SyncContractsRevokeWorkspaceInviteResponse> =>
    sendWorkspacePeopleMutation({
      apiBaseUrl,
      invalidMessage: "Malformed workspace invite revoke JSON.",
      method: "DELETE",
      path: `/workspaces/${workspaceId}/invites/${inviteId}`,
      responseSchema: syncContractsRevokeWorkspaceInviteResponseSchema,
    })

  const updateWorkspaceMemberRole = ({
    memberId,
    role,
    workspaceId,
  }: SyncContractsUpdateWorkspaceMemberRolePath &
    SyncContractsUpdateWorkspaceMemberRolePayload): Promise<SyncContractsUpdateWorkspaceMemberRoleResponse> =>
    sendWorkspacePeopleMutation({
      apiBaseUrl,
      body: JSON.stringify({
        role,
      }),
      invalidMessage: "Malformed workspace member role JSON.",
      method: "PATCH",
      path: `/workspaces/${workspaceId}/members/${memberId}/role`,
      responseSchema: syncContractsUpdateWorkspaceMemberRoleResponseSchema,
    })

  const removeWorkspaceMember = ({
    memberId,
    workspaceId,
  }: SyncContractsRemoveWorkspaceMemberPath): Promise<SyncContractsRemoveWorkspaceMemberResponse> =>
    sendWorkspacePeopleMutation({
      apiBaseUrl,
      invalidMessage: "Malformed workspace member removal JSON.",
      method: "DELETE",
      path: `/workspaces/${workspaceId}/members/${memberId}`,
      responseSchema: syncContractsRemoveWorkspaceMemberResponseSchema,
    })

  return {
    createWorkspaceInvite,
    removeWorkspaceMember,
    resendWorkspaceInvite,
    revokeWorkspaceInvite,
    updateWorkspaceMemberRole,
  }
}

export {
  createWorkspacePeopleSyncMutationClient,
  workspacePeopleSyncCommandsBasePath,
}
