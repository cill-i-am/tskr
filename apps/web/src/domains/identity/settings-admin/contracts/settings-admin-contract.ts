import { z } from "zod"

const settingsAdminWorkspaceRoleSchema = z.enum([
  "owner",
  "admin",
  "dispatcher",
  "field_worker",
])

const settingsAdminAccountProfileSchema = z.object({
  email: z.string(),
  id: z.string(),
  image: z.string().nullable(),
  name: z.string(),
})

const settingsAdminUpdateAccountProfileRequestSchema = z.object({
  image: z.string().nullable().optional(),
  name: z.string(),
})

const settingsAdminWorkspaceProfileSchema = z.object({
  id: z.string(),
  logo: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
})

const settingsAdminUpdateWorkspaceProfileRequestSchema = z.object({
  logo: z.string().nullable().optional(),
  name: z.string(),
})

const settingsAdminCreateWorkspaceInviteRequestSchema = z.object({
  email: z.string(),
  role: settingsAdminWorkspaceRoleSchema,
})

const settingsAdminUpdateWorkspaceMemberRoleRequestSchema = z.object({
  role: settingsAdminWorkspaceRoleSchema,
})

const settingsAdminPermissionsSchema = z.object({
  canEditWorkspaceProfile: z.boolean(),
  canInviteRoles: z.array(settingsAdminWorkspaceRoleSchema),
  canManageInvites: z.boolean(),
  canManageMembers: z.boolean(),
})

const settingsAdminMemberPermissionsSchema = z.object({
  assignableRoles: z.array(settingsAdminWorkspaceRoleSchema),
  canChangeRole: z.boolean(),
  canRemove: z.boolean(),
})

const settingsAdminInvitePermissionsSchema = z.object({
  canResend: z.boolean(),
  canRevoke: z.boolean(),
})

const settingsAdminMemberSchema = z.object({
  email: z.string(),
  id: z.string(),
  image: z.string().nullable(),
  isCurrentUser: z.boolean(),
  name: z.string(),
  permissions: settingsAdminMemberPermissionsSchema,
  role: settingsAdminWorkspaceRoleSchema,
  userId: z.string(),
})

const settingsAdminInviteSchema = z.object({
  acceptUrl: z.string(),
  code: z.string(),
  email: z.string(),
  id: z.string(),
  permissions: settingsAdminInvitePermissionsSchema,
  role: settingsAdminWorkspaceRoleSchema,
  status: z.string(),
  workspaceId: z.string(),
})

const createWorkspaceInviteResponseSchema = settingsAdminInviteSchema

const settingsAdminSnapshotSchema = z.object({
  accountProfile: settingsAdminAccountProfileSchema,
  members: z.array(settingsAdminMemberSchema),
  pendingInvites: z.array(settingsAdminInviteSchema),
  permissions: settingsAdminPermissionsSchema,
  viewerRole: settingsAdminWorkspaceRoleSchema,
  workspaceProfile: settingsAdminWorkspaceProfileSchema,
})

const settingsAdminUpdateWorkspaceMemberRoleResponseSchema = z.object({
  memberId: z.string(),
  role: settingsAdminWorkspaceRoleSchema,
  workspaceId: z.string(),
})

type SettingsAdminWorkspaceRole = z.infer<
  typeof settingsAdminWorkspaceRoleSchema
>
type SettingsAdminAccountProfile = z.infer<
  typeof settingsAdminAccountProfileSchema
>
type SettingsAdminUpdateAccountProfileRequest = z.infer<
  typeof settingsAdminUpdateAccountProfileRequestSchema
>
type SettingsAdminWorkspaceProfile = z.infer<
  typeof settingsAdminWorkspaceProfileSchema
>
type SettingsAdminUpdateWorkspaceProfileRequest = z.infer<
  typeof settingsAdminUpdateWorkspaceProfileRequestSchema
>
type SettingsAdminCreateWorkspaceInviteRequest = z.infer<
  typeof settingsAdminCreateWorkspaceInviteRequestSchema
>
type SettingsAdminPermissions = z.infer<typeof settingsAdminPermissionsSchema>
type SettingsAdminMemberPermissions = z.infer<
  typeof settingsAdminMemberPermissionsSchema
>
type SettingsAdminInvitePermissions = z.infer<
  typeof settingsAdminInvitePermissionsSchema
>
type SettingsAdminMember = z.infer<typeof settingsAdminMemberSchema>
type SettingsAdminWorkspaceInvite = z.infer<typeof settingsAdminInviteSchema>
type CreateWorkspaceInviteResponse = z.infer<
  typeof createWorkspaceInviteResponseSchema
>
type SettingsAdminSnapshot = z.infer<typeof settingsAdminSnapshotSchema>
type SettingsAdminUpdateWorkspaceMemberRoleRequest = z.infer<
  typeof settingsAdminUpdateWorkspaceMemberRoleRequestSchema
>
type SettingsAdminUpdateWorkspaceMemberRoleResponse = z.infer<
  typeof settingsAdminUpdateWorkspaceMemberRoleResponseSchema
>

export {
  createWorkspaceInviteResponseSchema,
  settingsAdminAccountProfileSchema,
  settingsAdminCreateWorkspaceInviteRequestSchema,
  settingsAdminInvitePermissionsSchema,
  settingsAdminInviteSchema,
  settingsAdminMemberPermissionsSchema,
  settingsAdminMemberSchema,
  settingsAdminPermissionsSchema,
  settingsAdminSnapshotSchema,
  settingsAdminUpdateAccountProfileRequestSchema,
  settingsAdminUpdateWorkspaceMemberRoleRequestSchema,
  settingsAdminUpdateWorkspaceMemberRoleResponseSchema,
  settingsAdminUpdateWorkspaceProfileRequestSchema,
  settingsAdminWorkspaceProfileSchema,
  settingsAdminWorkspaceRoleSchema,
}
export type {
  CreateWorkspaceInviteResponse,
  SettingsAdminAccountProfile,
  SettingsAdminCreateWorkspaceInviteRequest,
  SettingsAdminInvitePermissions,
  SettingsAdminMember,
  SettingsAdminMemberPermissions,
  SettingsAdminPermissions,
  SettingsAdminSnapshot,
  SettingsAdminUpdateAccountProfileRequest,
  SettingsAdminUpdateWorkspaceMemberRoleRequest,
  SettingsAdminUpdateWorkspaceMemberRoleResponse,
  SettingsAdminUpdateWorkspaceProfileRequest,
  SettingsAdminWorkspaceInvite,
  SettingsAdminWorkspaceProfile,
  SettingsAdminWorkspaceRole,
}
