import type {
  SettingsAdminAccountProfile,
  SettingsAdminPermissions,
  SettingsAdminSnapshot,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { getAccountProfile } from "@/domains/identity/settings-admin/infra/get-account-profile"
import { getSettingsSnapshot } from "@/domains/identity/settings-admin/infra/get-settings-snapshot"
import { createKeyedSingleFlight } from "@/domains/shared/application/single-flight"
import type {
  WorkspaceBootstrap,
  WorkspaceRole,
} from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { redirect } from "@tanstack/react-router"

interface SettingsRouteLoaderData {
  snapshot: SettingsAdminSnapshot | null
}

interface AccountSettingsRouteLoaderData {
  accountProfile: SettingsAdminAccountProfile
}

interface AppRouteParentMatch {
  loaderData?: WorkspaceBootstrap
}

interface SettingsRouteParentMatch {
  loaderData?: SettingsRouteLoaderData
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

const loadSettingsSnapshotOnce = createKeyedSingleFlight(loadSettingsSnapshot)

const canRecoverFromSettingsSnapshotError = (error: unknown) =>
  error instanceof Error &&
  error.message !== invalidSettingsSnapshotMessage &&
  error.message !== malformedSettingsSnapshotMessage

const getAppBootstrapFromParent = async ({
  parentMatchPromise,
}: {
  parentMatchPromise: Promise<AppRouteParentMatch>
}) => {
  const parentMatch = await parentMatchPromise
  const { loaderData: bootstrap } = parentMatch

  if (!bootstrap) {
    throw new Error("Expected app bootstrap loader data to be available.")
  }

  return bootstrap
}

const requireSettingsAccess = async ({
  parentMatchPromise,
}: {
  parentMatchPromise: Promise<AppRouteParentMatch>
}) => {
  const { activeWorkspace } = await getAppBootstrapFromParent({
    parentMatchPromise,
  })

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

const getSettingsRouteLoaderDataFromParent = async ({
  parentMatchPromise,
}: {
  parentMatchPromise: Promise<SettingsRouteParentMatch>
}) => {
  const parentMatch = await parentMatchPromise
  const { loaderData } = parentMatch

  if (!loaderData) {
    throw new Error("Expected settings route loader data to be available.")
  }

  return loaderData
}

const requireWorkspaceAdminSettingsAccess = async ({
  parentMatchPromise,
}: {
  parentMatchPromise: Promise<SettingsRouteParentMatch>
}) => {
  const { snapshot } = await getSettingsRouteLoaderDataFromParent({
    parentMatchPromise,
  })

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

const requireWorkspaceProfileSettingsAccess = async ({
  parentMatchPromise,
}: {
  parentMatchPromise: Promise<SettingsRouteParentMatch>
}) => {
  const { snapshot } = await requireWorkspaceAdminSettingsAccess({
    parentMatchPromise,
  })

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

const requirePeopleSettingsAccess = async ({
  parentMatchPromise,
}: {
  parentMatchPromise: Promise<SettingsRouteParentMatch>
}) => {
  const { snapshot } = await requireWorkspaceAdminSettingsAccess({
    parentMatchPromise,
  })

  if (!hasPeopleSettingsAccess(snapshot.permissions)) {
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
  parentMatchPromise,
}: {
  location: {
    pathname: string
  }
  parentMatchPromise: Promise<AppRouteParentMatch>
}): Promise<SettingsRouteLoaderData> => {
  const access = await requireSettingsAccess({
    parentMatchPromise,
  })

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
        snapshot: await loadSettingsSnapshotOnce(access.activeWorkspace.id),
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
    ? await loadSettingsSnapshotOnce(access.activeWorkspace.id)
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
  requireAccountSettingsAccess,
  requirePeopleSettingsAccess,
  requireWorkspaceAdminSettingsAccess,
  requireWorkspaceProfileSettingsAccess,
}
export type { SettingsRouteLoaderData }
