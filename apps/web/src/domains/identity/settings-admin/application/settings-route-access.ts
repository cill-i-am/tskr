import type { SettingsAdminSnapshot } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { getSettingsSnapshot } from "@/domains/identity/settings-admin/infra/get-settings-snapshot"
import { resolveWorkspaceEntry } from "@/domains/workspaces/bootstrap/application/resolve-workspace-entry"
import type { WorkspaceRole } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { getWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client"
import { redirect } from "@tanstack/react-router"

interface SettingsRouteLoaderData {
  isAdmin: boolean
  snapshot: SettingsAdminSnapshot | null
}

const isSettingsAdminRole = (role: WorkspaceRole) =>
  role === "owner" || role === "admin"

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
    isAdmin: isSettingsAdminRole(activeWorkspace.role),
  }
}

const requireAdminSettingsAccess = async () => {
  const access = await requireSettingsAccess()

  if (!access.isAdmin) {
    throw redirect({
      replace: true,
      to: "/app/settings/account",
    })
  }

  return access
}

const loadSettingsRouteData = async (): Promise<SettingsRouteLoaderData> => {
  const access = await requireSettingsAccess()

  return {
    isAdmin: access.isAdmin,
    snapshot: access.isAdmin
      ? await getSettingsSnapshot({
          workspaceId: access.activeWorkspace.id,
        })
      : null,
  }
}

export {
  loadSettingsRouteData,
  requireAdminSettingsAccess,
  requireSettingsAccess,
}
export type { SettingsRouteLoaderData }
