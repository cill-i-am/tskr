import {
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
} from "@workspace/sync-contracts"
import type {
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
} from "@workspace/sync-contracts"

const role: SyncContractsWorkspaceRole = "dispatcher"
const syncConfirmation: SyncContractsSyncConfirmation = {
  txid: "tx-123",
}

const workspaceInvite: SyncContractsWorkspaceInvite = {
  acceptUrl: "https://app.tskr.test/invites/accept?code=invite-123",
  code: "invite-123",
  email: "ada@example.com",
  id: "invite-1",
  role,
  status: "pending",
  workspaceId: "workspace-123",
}

const createPath: SyncContractsCreateWorkspaceInvitePath = {
  workspaceId: "workspace-123",
}

const createPayload: SyncContractsCreateWorkspaceInvitePayload = {
  email: "ada@example.com",
  role,
}

const createResponse: SyncContractsCreateWorkspaceInviteResponse = {
  invite: workspaceInvite,
  syncConfirmation,
}

const resendPath: SyncContractsResendWorkspaceInvitePath = {
  inviteId: workspaceInvite.id,
  workspaceId: workspaceInvite.workspaceId,
}

const resendResponse: SyncContractsResendWorkspaceInviteResponse = {
  inviteId: workspaceInvite.id,
  syncConfirmation,
  workspaceId: workspaceInvite.workspaceId,
}

const revokePath: SyncContractsRevokeWorkspaceInvitePath = {
  inviteId: workspaceInvite.id,
  workspaceId: workspaceInvite.workspaceId,
}

const revokeResponse: SyncContractsRevokeWorkspaceInviteResponse = {
  inviteId: workspaceInvite.id,
  syncConfirmation,
  workspaceId: workspaceInvite.workspaceId,
}

const updatePath: SyncContractsUpdateWorkspaceMemberRolePath = {
  memberId: "member-1",
  workspaceId: "workspace-123",
}

const updatePayload: SyncContractsUpdateWorkspaceMemberRolePayload = {
  role,
}

const updateResponse: SyncContractsUpdateWorkspaceMemberRoleResponse = {
  memberId: "member-1",
  role,
  syncConfirmation,
  workspaceId: "workspace-123",
}

const removePath: SyncContractsRemoveWorkspaceMemberPath = {
  memberId: "member-1",
  workspaceId: "workspace-123",
}

const removeResponse: SyncContractsRemoveWorkspaceMemberResponse = {
  memberId: "member-1",
  syncConfirmation,
  workspaceId: "workspace-123",
}

const invalidRequestError: SyncContractsInvalidRequestError = {
  message: "Role is invalid.",
  reason: "invalid_request",
}

const unauthorizedError: SyncContractsUnauthorizedError = {
  message: "Authentication is required.",
  reason: "unauthorized",
}

const forbiddenError: SyncContractsForbiddenError = {
  message: "You do not have access.",
  reason: "forbidden",
}

const notFoundError: SyncContractsNotFoundError = {
  message: "Invite not found.",
  reason: "not_found",
}

const conflictError: SyncContractsConflictError = {
  message: "Invite already exists.",
  reason: "conflict",
}

const syncContractsConsumerContractProof = [
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
  role,
  syncConfirmation,
  workspaceInvite,
  createPath,
  createPayload,
  createResponse,
  resendPath,
  resendResponse,
  revokePath,
  revokeResponse,
  updatePath,
  updatePayload,
  updateResponse,
  removePath,
  removeResponse,
  invalidRequestError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
]

export { syncContractsConsumerContractProof }
