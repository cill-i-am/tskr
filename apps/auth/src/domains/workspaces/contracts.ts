type RecoveryState =
  | "active_valid"
  | "auto_switched"
  | "selection_required"
  | "onboarding_required"

interface WorkspaceMembership {
  id: string
  logo: string | null
  name: string
  role: string
  slug: string
}

interface PendingWorkspaceInvite {
  email: string
  expiresAt: string
  id: string
  role: string | null
  status: string
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
}

interface WorkspaceBootstrap {
  activeWorkspace: WorkspaceMembership | null
  memberships: WorkspaceMembership[]
  pendingInvites: PendingWorkspaceInvite[]
  recoveryState: RecoveryState
}

interface WorkspaceSession {
  activeWorkspaceId: string | null
  email: string
  token: string
  userId: string
}

export type {
  PendingWorkspaceInvite,
  RecoveryState,
  WorkspaceBootstrap,
  WorkspaceMembership,
  WorkspaceSession,
}
