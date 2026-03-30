import type {
  SettingsAdminAccountProfile,
  SettingsAdminPermissions,
  SettingsAdminSnapshot,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { getAccountProfile } from "@/domains/identity/settings-admin/infra/get-account-profile"
import { getSettingsSnapshot } from "@/domains/identity/settings-admin/infra/get-settings-snapshot"
import { resolveWorkspaceEntry } from "@/domains/workspaces/bootstrap/application/resolve-workspace-entry"
import type { WorkspaceRole } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { getWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client"
import { redirect } from "@tanstack/react-router"

interface SettingsRouteLoaderData {
  snapshot: SettingsAdminSnapshot | null
}

interface AccountSettingsRouteLoaderData {
  accountProfile: SettingsAdminAccountProfile
}

const forbiddenSettingsSnapshotMessage =
  "You are not allowed to manage settings for this workspace."
const invalidSettingsSnapshotMessage = "Invalid settings snapshot payload."
const malformedSettingsSnapshotMessage = "Malformed settings snapshot JSON."

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

const canRecoverFromSettingsSnapshotError = (error: unknown) =>
  error instanceof Error &&
  error.message !== invalidSettingsSnapshotMessage &&
  error.message !== malformedSettingsSnapshotMessage

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

const requireAccountSettingsAccess =
  async (): Promise<AccountSettingsRouteLoaderData> => ({
    accountProfile: await getAccountProfile(),
  })

const loadSettingsRouteData = async ({
  location,
}: {
  location: {
    pathname: string
  }
}): Promise<SettingsRouteLoaderData> => {
  const access = await requireSettingsAccess()

  const canLoadSnapshot = canRequestSettingsSnapshot(
    access.activeWorkspace.role
  )

  if (location.pathname === "/app/settings/account") {
    if (!canLoadSnapshot) {
      return {
        snapshot: null,
      }
    }

    try {
      return {
        snapshot: await loadSettingsSnapshot(access.activeWorkspace.id),
      }
    } catch (error) {
      if (!canRecoverFromSettingsSnapshotError(error)) {
        throw error
      }

      return {
        snapshot: null,
      }
    }
  }

  const snapshot = canLoadSnapshot
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
  requireAccountSettingsAccess,
  requireWorkspaceAdminSettingsAccess,
  requireWorkspaceProfileSettingsAccess,
}
export type { SettingsRouteLoaderData }
