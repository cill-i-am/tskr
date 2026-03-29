import type {
  SettingsAdminPermissions,
  SettingsAdminSnapshot,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { getSettingsSnapshot } from "@/domains/identity/settings-admin/infra/get-settings-snapshot"
import { resolveWorkspaceEntry } from "@/domains/workspaces/bootstrap/application/resolve-workspace-entry"
import type { WorkspaceRole } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { getWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client"
import { redirect } from "@tanstack/react-router"

interface SettingsRouteLoaderData {
  snapshot: SettingsAdminSnapshot | null
}

const forbiddenSettingsSnapshotMessage =
  "You are not allowed to manage settings for this workspace."

const hasPeopleSettingsAccess = (permissions: SettingsAdminPermissions) =>
  permissions.canManageInvites ||
  permissions.canManageMembers ||
  permissions.canInviteRoles.length > 0

const hasWorkspaceAdminAccess = (permissions: SettingsAdminPermissions) =>
  permissions.canEditWorkspaceProfile || hasPeopleSettingsAccess(permissions)

const canRequestSettingsSnapshot = (role: WorkspaceRole) =>
  role === "owner" || role === "admin"

const loadSettingsSnapshot = async (workspaceId: string) => {
  try {
    return await getSettingsSnapshot({
      workspaceId,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === forbiddenSettingsSnapshotMessage
    ) {
      return null
    }

    throw error
  }
}

const requireSettingsAccess = async () => {
  const workspaceEntry = resolveWorkspaceEntry(await getWorkspaceBootstrap())

  if (workspaceEntry.state === "needs_auth") {
    throw redirect({
      replace: true,
      to: "/login",
    })
  }

  if (workspaceEntry.state === "needs_onboarding") {
    throw redirect({
      replace: true,
      to: "/onboarding",
    })
  }

  const { activeWorkspace } = workspaceEntry.bootstrap

  if (!activeWorkspace) {
    throw redirect({
      replace: true,
      to: "/onboarding",
    })
  }

  return {
    activeWorkspace,
  }
}

const requireWorkspaceAdminSettingsAccess = async () => {
  const access = await requireSettingsAccess()

  if (!canRequestSettingsSnapshot(access.activeWorkspace.role)) {
    throw redirect({
      replace: true,
      to: "/app/settings/account",
    })
  }

  const snapshot = await loadSettingsSnapshot(access.activeWorkspace.id)

  if (!snapshot || !hasWorkspaceAdminAccess(snapshot.permissions)) {
    throw redirect({
      replace: true,
      to: "/app/settings/account",
    })
  }

  return {
    snapshot,
  }
}

const requireWorkspaceProfileSettingsAccess = async () => {
  const { snapshot } = await requireWorkspaceAdminSettingsAccess()

  if (!snapshot.permissions.canEditWorkspaceProfile) {
    throw redirect({
      replace: true,
      to: "/app/settings/account",
    })
  }

  return {
    snapshot,
  }
}

const loadSettingsRouteData = async ({
  location,
}: {
  location: {
    pathname: string
  }
}): Promise<SettingsRouteLoaderData> => {
  const access = await requireSettingsAccess()
  const snapshot = canRequestSettingsSnapshot(access.activeWorkspace.role)
    ? await loadSettingsSnapshot(access.activeWorkspace.id)
    : null

  if (
    location.pathname === "/app/settings" &&
    (!snapshot || !hasWorkspaceAdminAccess(snapshot.permissions))
  ) {
    throw redirect({
      replace: true,
      to: "/app/settings/account",
    })
  }

  return {
    snapshot,
  }
}

export {
  hasPeopleSettingsAccess,
  hasWorkspaceAdminAccess,
  loadSettingsRouteData,
  requireSettingsAccess,
  requireWorkspaceAdminSettingsAccess,
  requireWorkspaceProfileSettingsAccess,
}
export type { SettingsRouteLoaderData }
