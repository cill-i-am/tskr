/* eslint-disable jest/expect-expect, jest/require-top-level-describe */

import assert from "node:assert/strict"

import { Schema } from "effect"

import {
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
} from "./index.ts"

const decode = (schema: Schema.Schema.Any, input: unknown) =>
  Schema.decodeUnknownSync(schema as Schema.Schema<unknown, unknown, never>)(
    input
  )

test("workspace role schema accepts the proving-slice roles", () => {
  assert.equal(decode(syncContractsWorkspaceRoleSchema, "owner"), "owner")
  assert.equal(decode(syncContractsWorkspaceRoleSchema, "admin"), "admin")
  assert.equal(
    decode(syncContractsWorkspaceRoleSchema, "dispatcher"),
    "dispatcher"
  )
  assert.equal(
    decode(syncContractsWorkspaceRoleSchema, "field_worker"),
    "field_worker"
  )
})

test("sync confirmation and mutation error schemas parse", () => {
  assert.deepEqual(
    decode(syncContractsSyncConfirmationSchema, { txid: "tx-123" }),
    {
      txid: "tx-123",
    }
  )
  assert.deepEqual(
    decode(syncContractsInvalidRequestErrorSchema, {
      message: "Role is invalid.",
      reason: "invalid_request",
    }),
    {
      message: "Role is invalid.",
      reason: "invalid_request",
    }
  )
  assert.deepEqual(
    decode(syncContractsUnauthorizedErrorSchema, {
      message: "Authentication is required.",
      reason: "unauthorized",
    }),
    {
      message: "Authentication is required.",
      reason: "unauthorized",
    }
  )
  assert.deepEqual(
    decode(syncContractsForbiddenErrorSchema, {
      message: "You do not have access.",
      reason: "forbidden",
    }),
    {
      message: "You do not have access.",
      reason: "forbidden",
    }
  )
  assert.deepEqual(
    decode(syncContractsNotFoundErrorSchema, {
      message: "Invite not found.",
      reason: "not_found",
    }),
    {
      message: "Invite not found.",
      reason: "not_found",
    }
  )
  assert.deepEqual(
    decode(syncContractsConflictErrorSchema, {
      message: "Invite already exists.",
      reason: "conflict",
    }),
    {
      message: "Invite already exists.",
      reason: "conflict",
    }
  )
})

test("create workspace invite path, payload, and response schemas parse", () => {
  const path = decode(syncContractsCreateWorkspaceInvitePathSchema, {
    workspaceId: "workspace-123",
  })
  const payload = decode(syncContractsCreateWorkspaceInvitePayloadSchema, {
    email: "ada@example.com",
    role: "admin",
  })
  const response = decode(syncContractsCreateWorkspaceInviteResponseSchema, {
    invite: {
      acceptUrl: "https://app.tskr.test/invites/accept?code=invite-123",
      code: "invite-123",
      email: "ada@example.com",
      id: "invite-1",
      role: "admin",
      status: "pending",
      workspaceId: "workspace-123",
    },
    syncConfirmation: {
      txid: "tx-123",
    },
  })

  assert.deepEqual(path, {
    workspaceId: "workspace-123",
  })
  assert.deepEqual(payload, {
    email: "ada@example.com",
    role: "admin",
  })
  assert.deepEqual(response, {
    invite: {
      acceptUrl: "https://app.tskr.test/invites/accept?code=invite-123",
      code: "invite-123",
      email: "ada@example.com",
      id: "invite-1",
      role: "admin",
      status: "pending",
      workspaceId: "workspace-123",
    },
    syncConfirmation: {
      txid: "tx-123",
    },
  })
})

test("workspace mutation path, payload, and response schemas parse", () => {
  const resendPath = decode(syncContractsResendWorkspaceInvitePathSchema, {
    inviteId: "invite-1",
    workspaceId: "workspace-123",
  })
  const revokePath = decode(syncContractsRevokeWorkspaceInvitePathSchema, {
    inviteId: "invite-1",
    workspaceId: "workspace-123",
  })
  const removePath = decode(syncContractsRemoveWorkspaceMemberPathSchema, {
    memberId: "member-1",
    workspaceId: "workspace-123",
  })
  const updatePath = decode(syncContractsUpdateWorkspaceMemberRolePathSchema, {
    memberId: "member-1",
    workspaceId: "workspace-123",
  })
  const updatePayload = decode(
    syncContractsUpdateWorkspaceMemberRolePayloadSchema,
    {
      role: "dispatcher",
    }
  )

  const resendResponse = decode(
    syncContractsResendWorkspaceInviteResponseSchema,
    {
      inviteId: "invite-1",
      syncConfirmation: {
        txid: "tx-124",
      },
      workspaceId: "workspace-123",
    }
  )
  const revokeResponse = decode(
    syncContractsRevokeWorkspaceInviteResponseSchema,
    {
      inviteId: "invite-1",
      syncConfirmation: {
        txid: "tx-125",
      },
      workspaceId: "workspace-123",
    }
  )
  const removeResponse = decode(
    syncContractsRemoveWorkspaceMemberResponseSchema,
    {
      memberId: "member-1",
      syncConfirmation: {
        txid: "tx-126",
      },
      workspaceId: "workspace-123",
    }
  )
  const updateResponse = decode(
    syncContractsUpdateWorkspaceMemberRoleResponseSchema,
    {
      memberId: "member-1",
      role: "dispatcher",
      syncConfirmation: {
        txid: "tx-127",
      },
      workspaceId: "workspace-123",
    }
  )

  assert.deepEqual(resendPath, {
    inviteId: "invite-1",
    workspaceId: "workspace-123",
  })
  assert.deepEqual(revokePath, {
    inviteId: "invite-1",
    workspaceId: "workspace-123",
  })
  assert.deepEqual(removePath, {
    memberId: "member-1",
    workspaceId: "workspace-123",
  })
  assert.deepEqual(updatePath, {
    memberId: "member-1",
    workspaceId: "workspace-123",
  })
  assert.deepEqual(updatePayload, {
    role: "dispatcher",
  })
  assert.deepEqual(resendResponse, {
    inviteId: "invite-1",
    syncConfirmation: {
      txid: "tx-124",
    },
    workspaceId: "workspace-123",
  })
  assert.deepEqual(revokeResponse, {
    inviteId: "invite-1",
    syncConfirmation: {
      txid: "tx-125",
    },
    workspaceId: "workspace-123",
  })
  assert.deepEqual(removeResponse, {
    memberId: "member-1",
    syncConfirmation: {
      txid: "tx-126",
    },
    workspaceId: "workspace-123",
  })
  assert.deepEqual(updateResponse, {
    memberId: "member-1",
    role: "dispatcher",
    syncConfirmation: {
      txid: "tx-127",
    },
    workspaceId: "workspace-123",
  })
})

test("workspace invite schema parses the proving-slice invite shape", () => {
  assert.deepEqual(
    decode(syncContractsWorkspaceInviteSchema, {
      acceptUrl: "https://app.tskr.test/invites/accept?code=invite-123",
      code: "invite-123",
      email: "ada@example.com",
      id: "invite-1",
      role: "owner",
      status: "pending",
      workspaceId: "workspace-123",
    }),
    {
      acceptUrl: "https://app.tskr.test/invites/accept?code=invite-123",
      code: "invite-123",
      email: "ada@example.com",
      id: "invite-1",
      role: "owner",
      status: "pending",
      workspaceId: "workspace-123",
    }
  )
})

test("http api group exposes the expected methods, paths, and payload boundaries", () => {
  const { endpoints } = syncContractsWorkspaceMembersMutationGroup

  assert.deepEqual(Object.keys(endpoints).toSorted(), [
    "createWorkspaceInvite",
    "removeWorkspaceMember",
    "resendWorkspaceInvite",
    "revokeWorkspaceInvite",
    "updateWorkspaceMemberRole",
  ])

  assert.equal(endpoints.createWorkspaceInvite.method, "POST")
  assert.equal(
    endpoints.createWorkspaceInvite.path,
    "/workspaces/:workspaceId/invites"
  )
  assert.equal(
    endpoints.resendWorkspaceInvite.path,
    "/workspaces/:workspaceId/invites/:inviteId/resend"
  )
  assert.equal(endpoints.revokeWorkspaceInvite.method, "DELETE")
  assert.equal(
    endpoints.updateWorkspaceMemberRole.path,
    "/workspaces/:workspaceId/members/:memberId/role"
  )
  assert.equal(endpoints.removeWorkspaceMember.method, "DELETE")
})
