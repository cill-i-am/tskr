import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"

const syncContractsWorkspaceRoleSchema = Schema.Literal(
  "owner",
  "admin",
  "dispatcher",
  "field_worker"
)

const syncContractsSyncConfirmationSchema = Schema.Struct({
  txid: Schema.Number,
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

const syncContractsCreateWorkspaceInvitePathSchema = Schema.Struct({
  workspaceId: Schema.String,
})

const syncContractsCreateWorkspaceInvitePayloadSchema = Schema.Struct({
  email: Schema.String,
  role: syncContractsWorkspaceRoleSchema,
})

const syncContractsCreateWorkspaceInviteResponseSchema = Schema.Struct({
  invite: syncContractsWorkspaceInviteSchema,
  syncConfirmation: syncContractsSyncConfirmationSchema,
})

const syncContractsResendWorkspaceInvitePathSchema = Schema.Struct({
  inviteId: Schema.String,
  workspaceId: Schema.String,
})

const syncContractsResendWorkspaceInviteResponseSchema = Schema.Struct({
  inviteId: Schema.String,
  syncConfirmation: syncContractsSyncConfirmationSchema,
  workspaceId: Schema.String,
})

const syncContractsRevokeWorkspaceInvitePathSchema =
  syncContractsResendWorkspaceInvitePathSchema

const syncContractsRevokeWorkspaceInviteResponseSchema = Schema.Struct({
  inviteId: Schema.String,
  syncConfirmation: syncContractsSyncConfirmationSchema,
  workspaceId: Schema.String,
})

const syncContractsUpdateWorkspaceMemberRolePathSchema = Schema.Struct({
  memberId: Schema.String,
  workspaceId: Schema.String,
})

const syncContractsUpdateWorkspaceMemberRolePayloadSchema = Schema.Struct({
  role: syncContractsWorkspaceRoleSchema,
})

const syncContractsUpdateWorkspaceMemberRoleResponseSchema = Schema.Struct({
  memberId: Schema.String,
  role: syncContractsWorkspaceRoleSchema,
  syncConfirmation: syncContractsSyncConfirmationSchema,
  workspaceId: Schema.String,
})

const syncContractsRemoveWorkspaceMemberPathSchema =
  syncContractsUpdateWorkspaceMemberRolePathSchema

const syncContractsRemoveWorkspaceMemberResponseSchema = Schema.Struct({
  memberId: Schema.String,
  syncConfirmation: syncContractsSyncConfirmationSchema,
  workspaceId: Schema.String,
})

const syncContractsInvalidRequestErrorSchema = Schema.Struct({
  message: Schema.String,
  reason: Schema.Literal("invalid_request"),
})

const syncContractsUnauthorizedErrorSchema = Schema.Struct({
  message: Schema.String,
  reason: Schema.Literal("unauthorized"),
})

const syncContractsForbiddenErrorSchema = Schema.Struct({
  message: Schema.String,
  reason: Schema.Literal("forbidden"),
})

const syncContractsNotFoundErrorSchema = Schema.Struct({
  message: Schema.String,
  reason: Schema.Literal("not_found"),
})

const syncContractsConflictErrorSchema = Schema.Struct({
  message: Schema.String,
  reason: Schema.Literal("conflict"),
})

const syncContractsWorkspaceMembersMutationGroup = HttpApiGroup.make(
  "workspace-members-mutations"
)
  .addError(syncContractsInvalidRequestErrorSchema, { status: 400 })
  .addError(syncContractsUnauthorizedErrorSchema, { status: 401 })
  .addError(syncContractsForbiddenErrorSchema, { status: 403 })
  .addError(syncContractsNotFoundErrorSchema, { status: 404 })
  .addError(syncContractsConflictErrorSchema, { status: 409 })
  .add(
    HttpApiEndpoint.post(
      "createWorkspaceInvite",
      "/workspaces/:workspaceId/invites"
    )
      .setPath(syncContractsCreateWorkspaceInvitePathSchema)
      .setPayload(syncContractsCreateWorkspaceInvitePayloadSchema)
      .addSuccess(syncContractsCreateWorkspaceInviteResponseSchema)
  )
  .add(
    HttpApiEndpoint.post(
      "resendWorkspaceInvite",
      "/workspaces/:workspaceId/invites/:inviteId/resend"
    )
      .setPath(syncContractsResendWorkspaceInvitePathSchema)
      .addSuccess(syncContractsResendWorkspaceInviteResponseSchema)
  )
  .add(
    HttpApiEndpoint.del(
      "revokeWorkspaceInvite",
      "/workspaces/:workspaceId/invites/:inviteId"
    )
      .setPath(syncContractsRevokeWorkspaceInvitePathSchema)
      .addSuccess(syncContractsRevokeWorkspaceInviteResponseSchema)
  )
  .add(
    HttpApiEndpoint.patch(
      "updateWorkspaceMemberRole",
      "/workspaces/:workspaceId/members/:memberId/role"
    )
      .setPath(syncContractsUpdateWorkspaceMemberRolePathSchema)
      .setPayload(syncContractsUpdateWorkspaceMemberRolePayloadSchema)
      .addSuccess(syncContractsUpdateWorkspaceMemberRoleResponseSchema)
  )
  .add(
    HttpApiEndpoint.del(
      "removeWorkspaceMember",
      "/workspaces/:workspaceId/members/:memberId"
    )
      .setPath(syncContractsRemoveWorkspaceMemberPathSchema)
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

type SyncContractsCreateWorkspaceInvitePath = Schema.Schema.Type<
  typeof syncContractsCreateWorkspaceInvitePathSchema
>

type SyncContractsCreateWorkspaceInvitePayload = Schema.Schema.Type<
  typeof syncContractsCreateWorkspaceInvitePayloadSchema
>

type SyncContractsCreateWorkspaceInviteResponse = Schema.Schema.Type<
  typeof syncContractsCreateWorkspaceInviteResponseSchema
>

type SyncContractsResendWorkspaceInvitePath = Schema.Schema.Type<
  typeof syncContractsResendWorkspaceInvitePathSchema
>

type SyncContractsResendWorkspaceInviteResponse = Schema.Schema.Type<
  typeof syncContractsResendWorkspaceInviteResponseSchema
>

type SyncContractsRevokeWorkspaceInvitePath = Schema.Schema.Type<
  typeof syncContractsRevokeWorkspaceInvitePathSchema
>

type SyncContractsRevokeWorkspaceInviteResponse = Schema.Schema.Type<
  typeof syncContractsRevokeWorkspaceInviteResponseSchema
>

type SyncContractsUpdateWorkspaceMemberRolePath = Schema.Schema.Type<
  typeof syncContractsUpdateWorkspaceMemberRolePathSchema
>

type SyncContractsUpdateWorkspaceMemberRolePayload = Schema.Schema.Type<
  typeof syncContractsUpdateWorkspaceMemberRolePayloadSchema
>

type SyncContractsUpdateWorkspaceMemberRoleResponse = Schema.Schema.Type<
  typeof syncContractsUpdateWorkspaceMemberRoleResponseSchema
>

type SyncContractsRemoveWorkspaceMemberPath = Schema.Schema.Type<
  typeof syncContractsRemoveWorkspaceMemberPathSchema
>

type SyncContractsRemoveWorkspaceMemberResponse = Schema.Schema.Type<
  typeof syncContractsRemoveWorkspaceMemberResponseSchema
>

type SyncContractsInvalidRequestError = Schema.Schema.Type<
  typeof syncContractsInvalidRequestErrorSchema
>

type SyncContractsUnauthorizedError = Schema.Schema.Type<
  typeof syncContractsUnauthorizedErrorSchema
>

type SyncContractsForbiddenError = Schema.Schema.Type<
  typeof syncContractsForbiddenErrorSchema
>

type SyncContractsNotFoundError = Schema.Schema.Type<
  typeof syncContractsNotFoundErrorSchema
>

type SyncContractsConflictError = Schema.Schema.Type<
  typeof syncContractsConflictErrorSchema
>

export {
  syncContractsApi,
  syncContractsConflictErrorSchema,
  syncContractsCreateWorkspaceInvitePathSchema,
  syncContractsCreateWorkspaceInvitePayloadSchema,
  syncContractsCreateWorkspaceInviteResponseSchema,
  syncContractsForbiddenErrorSchema,
  syncContractsInvalidRequestErrorSchema,
  syncContractsNotFoundErrorSchema,
  syncContractsRemoveWorkspaceMemberPathSchema,
  syncContractsRemoveWorkspaceMemberResponseSchema,
  syncContractsResendWorkspaceInvitePathSchema,
  syncContractsResendWorkspaceInviteResponseSchema,
  syncContractsRevokeWorkspaceInvitePathSchema,
  syncContractsRevokeWorkspaceInviteResponseSchema,
  syncContractsSyncConfirmationSchema,
  syncContractsUnauthorizedErrorSchema,
  syncContractsUpdateWorkspaceMemberRolePathSchema,
  syncContractsUpdateWorkspaceMemberRolePayloadSchema,
  syncContractsUpdateWorkspaceMemberRoleResponseSchema,
  syncContractsWorkspaceInviteSchema,
  syncContractsWorkspaceMembersMutationGroup,
  syncContractsWorkspaceRoleSchema,
}
export type {
  SyncContractsConflictError,
  SyncContractsCreateWorkspaceInvitePath,
  SyncContractsCreateWorkspaceInvitePayload,
  SyncContractsCreateWorkspaceInviteResponse,
  SyncContractsForbiddenError,
  SyncContractsInvalidRequestError,
  SyncContractsNotFoundError,
  SyncContractsRemoveWorkspaceMemberPath,
  SyncContractsRemoveWorkspaceMemberResponse,
  SyncContractsResendWorkspaceInvitePath,
  SyncContractsResendWorkspaceInviteResponse,
  SyncContractsRevokeWorkspaceInvitePath,
  SyncContractsRevokeWorkspaceInviteResponse,
  SyncContractsSyncConfirmation,
  SyncContractsUnauthorizedError,
  SyncContractsUpdateWorkspaceMemberRolePath,
  SyncContractsUpdateWorkspaceMemberRolePayload,
  SyncContractsUpdateWorkspaceMemberRoleResponse,
  SyncContractsWorkspaceInvite,
  SyncContractsWorkspaceRole,
}
