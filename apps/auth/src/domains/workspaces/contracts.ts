type WorkspaceRole = "owner" | "admin" | "dispatcher" | "field_worker"

const workspaceRoles = ["owner", "admin", "dispatcher", "field_worker"] as const

type RecoveryState =
  | "active_valid"
  | "auto_switched"
  | "selection_required"
  | "onboarding_required"

interface WorkspaceMembership {
  id: string
  logo: string | null
  name: string
  role: WorkspaceRole
  slug: string
}

interface PendingWorkspaceInvite {
  email: string
  expiresAt: string
  id: string
  role: WorkspaceRole | null
  status: string
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
}

interface WorkspaceInvite {
  acceptUrl: string
  code: string
  email: string
  id: string
  role: WorkspaceRole
  status: string
  workspaceId: string
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
  WorkspaceInvite,
  WorkspaceMembership,
  WorkspaceRole,
  WorkspaceSession,
}
export { workspaceRoles }
