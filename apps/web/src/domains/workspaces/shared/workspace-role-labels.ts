import type { SettingsAdminWorkspaceRole } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import type { WorkspaceRole } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"

type KnownWorkspaceRole = SettingsAdminWorkspaceRole | WorkspaceRole

const workspaceRoleLabels: Record<KnownWorkspaceRole, string> = {
  admin: "Admin",
  dispatcher: "Dispatcher",
  field_worker: "Field worker",
  owner: "Owner",
}

const getWorkspaceRoleLabel = (role: KnownWorkspaceRole | null) =>
  role ? workspaceRoleLabels[role] : "Role pending"

export { getWorkspaceRoleLabel, workspaceRoleLabels }
export type { KnownWorkspaceRole }
