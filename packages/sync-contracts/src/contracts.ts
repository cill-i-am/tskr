import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"

const syncContractsWorkspaceRoleSchema = Schema.Literal(
  "owner",
  "admin",
  "dispatcher",
  "field_worker"
)

const syncContractsSyncConfirmationSchema = Schema.Struct({
  txid: Schema.String,
})

const syncContractsWorkspaceInviteSchema = Schema.Struct({
  acceptUrl: Schema.String,
  code: Schema.String,
  email: Schema.String,
  id: Schema.String,
  role: syncContractsWorkspaceRoleSchema,
  status: Schema.String,
  workspaceId: Schema.String,
})

const workspacePathSchema = Schema.Struct({
  workspaceId: Schema.String,
})

const workspaceInvitePathSchema = Schema.Struct({
  inviteId: Schema.String,
  workspaceId: Schema.String,
})

const workspaceMemberPathSchema = Schema.Struct({
  memberId: Schema.String,
  workspaceId: Schema.String,
})

const createWorkspaceInvitePayloadSchema = Schema.Struct({
  email: Schema.String,
  role: syncContractsWorkspaceRoleSchema,
})

const syncContractsCreateWorkspaceInviteRequestSchema = Schema.Struct({
  email: Schema.String,
  role: syncContractsWorkspaceRoleSchema,
  workspaceId: Schema.String,
})

const syncContractsCreateWorkspaceInviteResponseSchema = Schema.Struct({
  invite: syncContractsWorkspaceInviteSchema,
  syncConfirmation: syncContractsSyncConfirmationSchema,
})

const syncContractsResendWorkspaceInviteRequestSchema =
  workspaceInvitePathSchema

const syncContractsResendWorkspaceInviteResponseSchema = Schema.Struct({
  inviteId: Schema.String,
  syncConfirmation: syncContractsSyncConfirmationSchema,
  workspaceId: Schema.String,
})

const syncContractsRevokeWorkspaceInviteRequestSchema =
  workspaceInvitePathSchema

const syncContractsRevokeWorkspaceInviteResponseSchema = Schema.Struct({
  inviteId: Schema.String,
  syncConfirmation: syncContractsSyncConfirmationSchema,
  workspaceId: Schema.String,
})

const updateWorkspaceMemberRolePayloadSchema = Schema.Struct({
  role: syncContractsWorkspaceRoleSchema,
})

const syncContractsUpdateWorkspaceMemberRoleRequestSchema = Schema.Struct({
  memberId: Schema.String,
  role: syncContractsWorkspaceRoleSchema,
  workspaceId: Schema.String,
})

const syncContractsUpdateWorkspaceMemberRoleResponseSchema = Schema.Struct({
  memberId: Schema.String,
  role: syncContractsWorkspaceRoleSchema,
  syncConfirmation: syncContractsSyncConfirmationSchema,
  workspaceId: Schema.String,
})

const syncContractsRemoveWorkspaceMemberRequestSchema =
  workspaceMemberPathSchema

const syncContractsRemoveWorkspaceMemberResponseSchema = Schema.Struct({
  memberId: Schema.String,
  syncConfirmation: syncContractsSyncConfirmationSchema,
  workspaceId: Schema.String,
})

const syncContractsWorkspaceMembersMutationGroup = HttpApiGroup.make(
  "workspace-members-mutations"
)
  .add(
    HttpApiEndpoint.post(
      "createWorkspaceInvite",
      "/workspaces/:workspaceId/invites"
    )
      .setPath(workspacePathSchema)
      .setPayload(createWorkspaceInvitePayloadSchema)
      .addSuccess(syncContractsCreateWorkspaceInviteResponseSchema)
  )
  .add(
    HttpApiEndpoint.post(
      "resendWorkspaceInvite",
      "/workspaces/:workspaceId/invites/:inviteId/resend"
    )
      .setPath(workspaceInvitePathSchema)
      .addSuccess(syncContractsResendWorkspaceInviteResponseSchema)
  )
  .add(
    HttpApiEndpoint.del(
      "revokeWorkspaceInvite",
      "/workspaces/:workspaceId/invites/:inviteId"
    )
      .setPath(workspaceInvitePathSchema)
      .addSuccess(syncContractsRevokeWorkspaceInviteResponseSchema)
  )
  .add(
    HttpApiEndpoint.patch(
      "updateWorkspaceMemberRole",
      "/workspaces/:workspaceId/members/:memberId/role"
    )
      .setPath(workspaceMemberPathSchema)
      .setPayload(updateWorkspaceMemberRolePayloadSchema)
      .addSuccess(syncContractsUpdateWorkspaceMemberRoleResponseSchema)
  )
  .add(
    HttpApiEndpoint.del(
      "removeWorkspaceMember",
      "/workspaces/:workspaceId/members/:memberId"
    )
      .setPath(workspaceMemberPathSchema)
      .addSuccess(syncContractsRemoveWorkspaceMemberResponseSchema)
  )

const syncContractsApi = HttpApi.make("sync-contracts").add(
  syncContractsWorkspaceMembersMutationGroup
)

type SyncContractsWorkspaceRole = Schema.Schema.Type<
  typeof syncContractsWorkspaceRoleSchema
>

type SyncContractsSyncConfirmation = Schema.Schema.Type<
  typeof syncContractsSyncConfirmationSchema
>

type SyncContractsWorkspaceInvite = Schema.Schema.Type<
  typeof syncContractsWorkspaceInviteSchema
>

type SyncContractsCreateWorkspaceInviteRequest = Schema.Schema.Type<
  typeof syncContractsCreateWorkspaceInviteRequestSchema
>

type SyncContractsCreateWorkspaceInviteResponse = Schema.Schema.Type<
  typeof syncContractsCreateWorkspaceInviteResponseSchema
>

type SyncContractsResendWorkspaceInviteRequest = Schema.Schema.Type<
  typeof syncContractsResendWorkspaceInviteRequestSchema
>

type SyncContractsResendWorkspaceInviteResponse = Schema.Schema.Type<
  typeof syncContractsResendWorkspaceInviteResponseSchema
>

type SyncContractsRevokeWorkspaceInviteRequest = Schema.Schema.Type<
  typeof syncContractsRevokeWorkspaceInviteRequestSchema
>

type SyncContractsRevokeWorkspaceInviteResponse = Schema.Schema.Type<
  typeof syncContractsRevokeWorkspaceInviteResponseSchema
>

type SyncContractsUpdateWorkspaceMemberRoleRequest = Schema.Schema.Type<
  typeof syncContractsUpdateWorkspaceMemberRoleRequestSchema
>

type SyncContractsUpdateWorkspaceMemberRoleResponse = Schema.Schema.Type<
  typeof syncContractsUpdateWorkspaceMemberRoleResponseSchema
>

type SyncContractsRemoveWorkspaceMemberRequest = Schema.Schema.Type<
  typeof syncContractsRemoveWorkspaceMemberRequestSchema
>

type SyncContractsRemoveWorkspaceMemberResponse = Schema.Schema.Type<
  typeof syncContractsRemoveWorkspaceMemberResponseSchema
>

export {
  syncContractsApi,
  syncContractsCreateWorkspaceInviteRequestSchema,
  syncContractsCreateWorkspaceInviteResponseSchema,
  syncContractsRemoveWorkspaceMemberRequestSchema,
  syncContractsRemoveWorkspaceMemberResponseSchema,
  syncContractsResendWorkspaceInviteRequestSchema,
  syncContractsResendWorkspaceInviteResponseSchema,
  syncContractsRevokeWorkspaceInviteRequestSchema,
  syncContractsRevokeWorkspaceInviteResponseSchema,
  syncContractsSyncConfirmationSchema,
  syncContractsUpdateWorkspaceMemberRoleRequestSchema,
  syncContractsUpdateWorkspaceMemberRoleResponseSchema,
  syncContractsWorkspaceInviteSchema,
  syncContractsWorkspaceMembersMutationGroup,
  syncContractsWorkspaceRoleSchema,
}
export type {
  SyncContractsCreateWorkspaceInviteRequest,
  SyncContractsCreateWorkspaceInviteResponse,
  SyncContractsRemoveWorkspaceMemberRequest,
  SyncContractsRemoveWorkspaceMemberResponse,
  SyncContractsResendWorkspaceInviteRequest,
  SyncContractsResendWorkspaceInviteResponse,
  SyncContractsRevokeWorkspaceInviteRequest,
  SyncContractsRevokeWorkspaceInviteResponse,
  SyncContractsSyncConfirmation,
  SyncContractsUpdateWorkspaceMemberRoleRequest,
  SyncContractsUpdateWorkspaceMemberRoleResponse,
  SyncContractsWorkspaceInvite,
  SyncContractsWorkspaceRole,
}
