import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"

import {
  syncContractsCreateWorkspaceInviteRequestSchema,
  syncContractsCreateWorkspaceInviteResponseSchema,
  syncContractsRemoveWorkspaceMemberRequestSchema,
  syncContractsRemoveWorkspaceMemberResponseSchema,
  syncContractsResendWorkspaceInviteRequestSchema,
  syncContractsResendWorkspaceInviteResponseSchema,
  syncContractsRevokeWorkspaceInviteRequestSchema,
  syncContractsRevokeWorkspaceInviteResponseSchema,
  syncContractsUpdateWorkspaceMemberRoleRequestSchema,
  syncContractsUpdateWorkspaceMemberRoleResponseSchema,
} from "./contracts.js"

const createWorkspaceInviteEndpoint = HttpApiEndpoint.post(
  "createWorkspaceInvite",
  "/workspace-members/invites"
)
  .setPayload(syncContractsCreateWorkspaceInviteRequestSchema)
  .addSuccess(syncContractsCreateWorkspaceInviteResponseSchema)

const resendWorkspaceInviteEndpoint = HttpApiEndpoint.post(
  "resendWorkspaceInvite",
  "/workspace-members/invites/resend"
)
  .setPayload(syncContractsResendWorkspaceInviteRequestSchema)
  .addSuccess(syncContractsResendWorkspaceInviteResponseSchema)

const revokeWorkspaceInviteEndpoint = HttpApiEndpoint.post(
  "revokeWorkspaceInvite",
  "/workspace-members/invites/revoke"
)
  .setPayload(syncContractsRevokeWorkspaceInviteRequestSchema)
  .addSuccess(syncContractsRevokeWorkspaceInviteResponseSchema)

const updateWorkspaceMemberRoleEndpoint = HttpApiEndpoint.post(
  "updateWorkspaceMemberRole",
  "/workspace-members/members/role"
)
  .setPayload(syncContractsUpdateWorkspaceMemberRoleRequestSchema)
  .addSuccess(syncContractsUpdateWorkspaceMemberRoleResponseSchema)

const removeWorkspaceMemberEndpoint = HttpApiEndpoint.post(
  "removeWorkspaceMember",
  "/workspace-members/members/remove"
)
  .setPayload(syncContractsRemoveWorkspaceMemberRequestSchema)
  .addSuccess(syncContractsRemoveWorkspaceMemberResponseSchema)

const syncContractsWorkspaceMembersMutationGroup = HttpApiGroup.make(
  "workspace-members-mutations"
)
  .add(createWorkspaceInviteEndpoint)
  .add(resendWorkspaceInviteEndpoint)
  .add(revokeWorkspaceInviteEndpoint)
  .add(updateWorkspaceMemberRoleEndpoint)
  .add(removeWorkspaceMemberEndpoint)

const syncContractsApi = HttpApi.make("sync-contracts").add(
  syncContractsWorkspaceMembersMutationGroup
)

export { syncContractsApi, syncContractsWorkspaceMembersMutationGroup }
