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

interface AccountProfile {
  email: string
  id: string
  image: string | null
  name: string
}

interface WorkspaceProfile {
  id: string
  logo: string | null
  name: string
  slug: string
}

interface WorkspaceSettingsPermissions {
  canEditWorkspaceProfile: boolean
  canInviteRoles: WorkspaceRole[]
  canManageInvites: boolean
  canManageMembers: boolean
}

interface WorkspaceSettingsMemberPermissions {
  assignableRoles: WorkspaceRole[]
  canChangeRole: boolean
  canRemove: boolean
}

interface WorkspaceSettingsInvitePermissions {
  canResend: boolean
  canRevoke: boolean
}

interface WorkspaceSettingsMember {
  email: string
  id: string
  image: string | null
  isCurrentUser: boolean
  name: string
  permissions: WorkspaceSettingsMemberPermissions
  role: WorkspaceRole
  userId: string
}

interface WorkspaceSettingsInvite {
  acceptUrl: string
  code: string
  email: string
  id: string
  permissions: WorkspaceSettingsInvitePermissions
  role: WorkspaceRole
  status: string
  workspaceId: string
}

interface WorkspaceSettingsSnapshot {
  accountProfile: AccountProfile
  members: WorkspaceSettingsMember[]
  pendingInvites: WorkspaceSettingsInvite[]
  permissions: WorkspaceSettingsPermissions
  viewerRole: WorkspaceRole
  workspaceProfile: WorkspaceProfile
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
  AccountProfile,
  PendingWorkspaceInvite,
  RecoveryState,
  WorkspaceProfile,
  WorkspaceBootstrap,
  WorkspaceInvite,
  WorkspaceMembership,
  WorkspaceRole,
  WorkspaceSession,
  WorkspaceSettingsInvite,
  WorkspaceSettingsInvitePermissions,
  WorkspaceSettingsMember,
  WorkspaceSettingsMemberPermissions,
  WorkspaceSettingsPermissions,
  WorkspaceSettingsSnapshot,
}
export { workspaceRoles }
