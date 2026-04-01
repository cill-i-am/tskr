import {
  syncContractsApi,
  syncContractsCreateWorkspaceInvitePathSchema,
  syncContractsCreateWorkspaceInvitePayloadSchema,
  syncContractsCreateWorkspaceInviteResponseSchema,
  syncContractsWorkspaceMembersMutationGroup,
} from "./contracts.js"

describe("workspace sync shared contracts", () => {
  it("consumes the shared sync-contracts package from api", () => {
    const apiGroupNames = Object.keys(syncContractsApi.groups)
    const endpointNames = Object.keys(
      syncContractsWorkspaceMembersMutationGroup.endpoints
    )

    apiGroupNames.sort()
    endpointNames.sort()

    expect(apiGroupNames).toStrictEqual(["workspace-members-mutations"])
    expect(endpointNames).toStrictEqual([
      "createWorkspaceInvite",
      "removeWorkspaceMember",
      "resendWorkspaceInvite",
      "revokeWorkspaceInvite",
      "updateWorkspaceMemberRole",
    ])
    expect(syncContractsCreateWorkspaceInvitePathSchema).toBeDefined()
    expect(syncContractsCreateWorkspaceInvitePayloadSchema).toBeDefined()
    expect(syncContractsCreateWorkspaceInviteResponseSchema).toBeDefined()
  })
})
