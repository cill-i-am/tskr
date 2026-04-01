/* eslint-disable jest/expect-expect, jest/require-top-level-describe */

import assert from "node:assert/strict"

import { Schema } from "effect"

import {
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
  syncContractsWorkspaceRoleSchema,
} from "./index.ts"

const decode = <S extends Schema.Schema.Any>(
  schema: S,
  input: unknown
): Schema.Schema.Type<S> =>
  Schema.decodeUnknownSync(schema as never)(input) as Schema.Schema.Type<S>

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

test("sync confirmation schema parses the txid envelope", () => {
  assert.deepEqual(
    decode(syncContractsSyncConfirmationSchema, { txid: "tx-123" }),
    {
      txid: "tx-123",
    }
  )
})

test("create workspace invite request and response schemas parse", () => {
  const request = decode(syncContractsCreateWorkspaceInviteRequestSchema, {
    email: "ada@example.com",
    role: "admin",
    workspaceId: "workspace-123",
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

  assert.deepEqual(request, {
    email: "ada@example.com",
    role: "admin",
    workspaceId: "workspace-123",
  })
  assert.deepEqual(response.invite, {
    acceptUrl: "https://app.tskr.test/invites/accept?code=invite-123",
    code: "invite-123",
    email: "ada@example.com",
    id: "invite-1",
    role: "admin",
    status: "pending",
    workspaceId: "workspace-123",
  })
  assert.deepEqual(response.syncConfirmation, {
    txid: "tx-123",
  })
})

test("workspace mutation request and response schemas parse", () => {
  const resendRequest = decode(
    syncContractsResendWorkspaceInviteRequestSchema,
    {
      inviteId: "invite-1",
      workspaceId: "workspace-123",
    }
  )
  const revokeRequest = decode(
    syncContractsRevokeWorkspaceInviteRequestSchema,
    {
      inviteId: "invite-1",
      workspaceId: "workspace-123",
    }
  )
  const removeRequest = decode(
    syncContractsRemoveWorkspaceMemberRequestSchema,
    {
      memberId: "member-1",
      workspaceId: "workspace-123",
    }
  )
  const updateRequest = decode(
    syncContractsUpdateWorkspaceMemberRoleRequestSchema,
    {
      memberId: "member-1",
      role: "dispatcher",
      workspaceId: "workspace-123",
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

  assert.deepEqual(resendRequest, {
    inviteId: "invite-1",
    workspaceId: "workspace-123",
  })
  assert.deepEqual(revokeRequest, {
    inviteId: "invite-1",
    workspaceId: "workspace-123",
  })
  assert.deepEqual(removeRequest, {
    memberId: "member-1",
    workspaceId: "workspace-123",
  })
  assert.deepEqual(updateRequest, {
    memberId: "member-1",
    role: "dispatcher",
    workspaceId: "workspace-123",
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
