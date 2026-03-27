import type { RecoveryState } from "./contracts.js"

interface RecoverActiveWorkspaceInput {
  activeWorkspaceId: string | null
  memberships: {
    id: string
  }[]
}

interface RecoverActiveWorkspaceResult {
  nextActiveWorkspaceId: string | null
  recoveryState: RecoveryState
}

const recoverActiveWorkspace = ({
  activeWorkspaceId,
  memberships,
}: RecoverActiveWorkspaceInput): RecoverActiveWorkspaceResult => {
  const activeMembership = memberships.find(
    (membership) => membership.id === activeWorkspaceId
  )

  if (activeMembership) {
    return {
      nextActiveWorkspaceId: activeMembership.id,
      recoveryState: "active_valid",
    }
  }

  if (memberships.length === 1) {
    return {
      nextActiveWorkspaceId: memberships[0]?.id ?? null,
      recoveryState: "auto_switched",
    }
  }

  if (memberships.length > 1) {
    return {
      nextActiveWorkspaceId: null,
      recoveryState: "selection_required",
    }
  }

  return {
    nextActiveWorkspaceId: null,
    recoveryState: "onboarding_required",
  }
}

export { recoverActiveWorkspace }
