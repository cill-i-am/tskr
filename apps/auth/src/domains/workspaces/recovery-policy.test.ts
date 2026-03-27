import { recoverActiveWorkspace } from "./recovery-policy.js"

describe(`recoverActiveWorkspace`, () => {
  it("keeps a valid active workspace", () => {
    const result = recoverActiveWorkspace({
      activeWorkspaceId: "workspace-1",
      memberships: [{ id: "workspace-1" }],
    })

    expect(result).toStrictEqual({
      nextActiveWorkspaceId: "workspace-1",
      recoveryState: "active_valid",
    })
  })

  it("auto-switches when exactly one membership remains", () => {
    const result = recoverActiveWorkspace({
      activeWorkspaceId: "workspace-stale",
      memberships: [{ id: "workspace-1" }],
    })

    expect(result).toStrictEqual({
      nextActiveWorkspaceId: "workspace-1",
      recoveryState: "auto_switched",
    })
  })

  it("requires explicit selection when several memberships remain", () => {
    const result = recoverActiveWorkspace({
      activeWorkspaceId: "workspace-stale",
      memberships: [{ id: "workspace-1" }, { id: "workspace-2" }],
    })

    expect(result).toStrictEqual({
      nextActiveWorkspaceId: null,
      recoveryState: "selection_required",
    })
  })

  it("requires onboarding when no memberships remain", () => {
    const result = recoverActiveWorkspace({
      activeWorkspaceId: "workspace-stale",
      memberships: [],
    })

    expect(result).toStrictEqual({
      nextActiveWorkspaceId: null,
      recoveryState: "onboarding_required",
    })
  })
})
