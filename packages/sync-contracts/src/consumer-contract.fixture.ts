import {
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
} from "@workspace/sync-contracts"
import type {
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

const createRequest: SyncContractsCreateWorkspaceInviteRequest = {
  email: "ada@example.com",
  role,
  workspaceId: "workspace-123",
}

const createResponse: SyncContractsCreateWorkspaceInviteResponse = {
  invite: workspaceInvite,
  syncConfirmation,
}

const resendRequest: SyncContractsResendWorkspaceInviteRequest = {
  inviteId: workspaceInvite.id,
  workspaceId: workspaceInvite.workspaceId,
}

const resendResponse: SyncContractsResendWorkspaceInviteResponse = {
  inviteId: workspaceInvite.id,
  syncConfirmation,
  workspaceId: workspaceInvite.workspaceId,
}

const revokeRequest: SyncContractsRevokeWorkspaceInviteRequest = {
  inviteId: workspaceInvite.id,
  workspaceId: workspaceInvite.workspaceId,
}

const revokeResponse: SyncContractsRevokeWorkspaceInviteResponse = {
  inviteId: workspaceInvite.id,
  syncConfirmation,
  workspaceId: workspaceInvite.workspaceId,
}

const updateRequest: SyncContractsUpdateWorkspaceMemberRoleRequest = {
  memberId: "member-1",
  role,
  workspaceId: "workspace-123",
}

const updateResponse: SyncContractsUpdateWorkspaceMemberRoleResponse = {
  memberId: "member-1",
  role,
  syncConfirmation,
  workspaceId: "workspace-123",
}

const removeRequest: SyncContractsRemoveWorkspaceMemberRequest = {
  memberId: "member-1",
  workspaceId: "workspace-123",
}

const removeResponse: SyncContractsRemoveWorkspaceMemberResponse = {
  memberId: "member-1",
  syncConfirmation,
  workspaceId: "workspace-123",
}

const syncContractsConsumerContractProof = [
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
  role,
  syncConfirmation,
  workspaceInvite,
  createRequest,
  createResponse,
  resendRequest,
  resendResponse,
  revokeRequest,
  revokeResponse,
  updateRequest,
  updateResponse,
  removeRequest,
  removeResponse,
]

export { syncContractsConsumerContractProof }
