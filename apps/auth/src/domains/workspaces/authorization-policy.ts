import { workspaceRoles } from "./contracts.js"
import type { WorkspaceRole } from "./contracts.js"

const parseRoleSet = (role: string) =>
  role
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

const hasRole = (role: string, candidate: WorkspaceRole) =>
  parseRoleSet(role).includes(candidate)

const isWorkspaceRole = (role: string): role is WorkspaceRole =>
  workspaceRoles.includes(role as WorkspaceRole)

const canManageWorkspaceInvites = (role: string) =>
  hasRole(role, "owner") || hasRole(role, "admin")

const canManageWorkspaceMembers = (role: string) =>
  hasRole(role, "owner") || hasRole(role, "admin")

const canManageWorkspaceSettings = (role: string) =>
  hasRole(role, "owner") || hasRole(role, "admin")

const canManageOwnerRole = (role: string) => hasRole(role, "owner")

export {
  canManageOwnerRole,
  canManageWorkspaceInvites,
  canManageWorkspaceMembers,
  canManageWorkspaceSettings,
  hasRole,
  isWorkspaceRole,
}
