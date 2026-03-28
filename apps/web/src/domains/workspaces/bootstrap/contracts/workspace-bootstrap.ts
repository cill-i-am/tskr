import { z } from "zod"

const workspaceRoleSchema = z.enum([
  "owner",
  "admin",
  "dispatcher",
  "field_worker",
])

const workspaceRecoveryStateSchema = z.enum([
  "active_valid",
  "auto_switched",
  "selection_required",
  "onboarding_required",
])

const workspaceMembershipSchema = z.object({
  id: z.string(),
  logo: z.string().nullable(),
  name: z.string(),
  role: workspaceRoleSchema,
  slug: z.string(),
})

const pendingWorkspaceInviteSchema = z.object({
  email: z.string(),
  expiresAt: z.string(),
  id: z.string(),
  role: workspaceRoleSchema.nullable(),
  status: z.string(),
  workspaceId: z.string(),
  workspaceName: z.string(),
  workspaceSlug: z.string(),
})

const workspaceBootstrapSchema = z.object({
  activeWorkspace: workspaceMembershipSchema.nullable(),
  memberships: z.array(workspaceMembershipSchema),
  pendingInvites: z.array(pendingWorkspaceInviteSchema),
  recoveryState: workspaceRecoveryStateSchema,
})

type WorkspaceRole = z.infer<typeof workspaceRoleSchema>
type WorkspaceRecoveryState = z.infer<typeof workspaceRecoveryStateSchema>
type WorkspaceMembership = z.infer<typeof workspaceMembershipSchema>
type PendingWorkspaceInvite = z.infer<typeof pendingWorkspaceInviteSchema>
type WorkspaceBootstrap = z.infer<typeof workspaceBootstrapSchema>

export {
  pendingWorkspaceInviteSchema,
  workspaceBootstrapSchema,
  workspaceMembershipSchema,
  workspaceRecoveryStateSchema,
  workspaceRoleSchema,
}
export type {
  PendingWorkspaceInvite,
  WorkspaceBootstrap,
  WorkspaceMembership,
  WorkspaceRecoveryState,
  WorkspaceRole,
}
