import type {
  SettingsAdminMember,
  SettingsAdminSnapshot,
  SettingsAdminWorkspaceInvite,
  SettingsAdminWorkspaceRole,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { useWorkspacePeopleSync } from "@/domains/identity/settings-admin/infra/sync/workspace-people-sync"
import type {
  LoadedWorkspacePeopleSyncData,
  WorkspacePeopleSyncInvite,
  WorkspacePeopleSyncMember,
} from "@/domains/identity/settings-admin/infra/sync/workspace-people-sync"
import { useIsHydrated } from "@/domains/shared/ui/use-is-hydrated"
import { useRouter } from "@tanstack/react-router"
import { useEffect, useEffectEvent, useState } from "react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"

import { InviteMemberForm } from "./invite-member-form"
import { WorkspaceInvitesTable } from "./workspace-invites-table"
import { WorkspaceMembersTable } from "./workspace-members-table"

interface PeopleSettingsPageProps {
  snapshot: SettingsAdminSnapshot
}

const SYNC_RECONCILIATION_FALLBACK_MS = 300

const defaultMemberPermissions: SettingsAdminMember["permissions"] = {
  assignableRoles: [],
  canChangeRole: false,
  canRemove: false,
}

const allAssignableRoles = [
  "owner",
  "admin",
  "dispatcher",
  "field_worker",
] as const satisfies readonly SettingsAdminWorkspaceRole[]

const nonOwnerAssignableRoles = [
  "admin",
  "dispatcher",
  "field_worker",
] as const satisfies readonly SettingsAdminWorkspaceRole[]

const canManageOwnerRole = (role: SettingsAdminWorkspaceRole | null) =>
  role === "owner"

const canManageWorkspaceInvites = (role: SettingsAdminWorkspaceRole | null) =>
  role === "owner" || role === "admin"

const canManageWorkspaceMembers = (role: SettingsAdminWorkspaceRole | null) =>
  role === "owner" || role === "admin"

const canManageWorkspaceSettings = (role: SettingsAdminWorkspaceRole | null) =>
  role === "owner" || role === "admin"

const deriveInvitableRoles = (
  viewerRole: null | SettingsAdminWorkspaceRole
): SettingsAdminWorkspaceRole[] => {
  if (!canManageWorkspaceInvites(viewerRole)) {
    return []
  }

  if (canManageOwnerRole(viewerRole)) {
    return [...allAssignableRoles]
  }

  return [...nonOwnerAssignableRoles]
}

const deriveWorkspacePermissions = ({
  viewerRole,
}: {
  viewerRole: null | SettingsAdminWorkspaceRole
}): SettingsAdminSnapshot["permissions"] => ({
  canEditWorkspaceProfile: canManageWorkspaceSettings(viewerRole),
  canInviteRoles: deriveInvitableRoles(viewerRole),
  canManageInvites: canManageWorkspaceInvites(viewerRole),
  canManageMembers: canManageWorkspaceMembers(viewerRole),
})

const deriveAssignableRoles = ({
  ownerCount,
  targetRole,
  targetUserId,
  viewerRole,
  viewerUserId,
}: {
  ownerCount: number
  targetRole: SettingsAdminWorkspaceRole
  targetUserId: string
  viewerRole: null | SettingsAdminWorkspaceRole
  viewerUserId: string
}): SettingsAdminWorkspaceRole[] => {
  if (!canManageWorkspaceMembers(viewerRole)) {
    return []
  }

  const isCurrentUser = targetUserId === viewerUserId
  const targetIsOwner = targetRole === "owner"

  if (!canManageOwnerRole(viewerRole)) {
    if (targetIsOwner) {
      return []
    }

    return [...nonOwnerAssignableRoles]
  }

  if (isCurrentUser && targetIsOwner) {
    return []
  }

  if (targetIsOwner && ownerCount <= 1) {
    return []
  }

  return [...allAssignableRoles]
}

const deriveMemberPermissions = ({
  member,
  ownerCount,
  viewerRole,
  viewerUserId,
}: {
  member: WorkspacePeopleSyncMember
  ownerCount: number
  viewerRole: null | SettingsAdminWorkspaceRole
  viewerUserId: string
}): SettingsAdminMember["permissions"] => {
  const assignableRoles = deriveAssignableRoles({
    ownerCount,
    targetRole: member.role,
    targetUserId: member.userId,
    viewerRole,
    viewerUserId,
  })

  if (member.userId === viewerUserId) {
    if (member.role === "owner") {
      return {
        assignableRoles,
        canChangeRole: assignableRoles.length > 0,
        canRemove: ownerCount > 1,
      }
    }

    return {
      assignableRoles,
      canChangeRole: assignableRoles.length > 0,
      canRemove: true,
    }
  }

  if (!canManageWorkspaceMembers(viewerRole)) {
    return defaultMemberPermissions
  }

  if (!canManageOwnerRole(viewerRole) && member.role === "owner") {
    return {
      assignableRoles,
      canChangeRole: false,
      canRemove: false,
    }
  }

  return {
    assignableRoles,
    canChangeRole: assignableRoles.length > 0,
    canRemove: true,
  }
}

const deriveInvitePermissions = ({
  inviteRole,
  viewerRole,
}: {
  inviteRole: SettingsAdminWorkspaceRole
  viewerRole: null | SettingsAdminWorkspaceRole
}): SettingsAdminWorkspaceInvite["permissions"] => {
  const canManageInvite =
    canManageWorkspaceInvites(viewerRole) &&
    (inviteRole !== "owner" || canManageOwnerRole(viewerRole))

  return {
    canResend: canManageInvite,
    canRevoke: canManageInvite,
  }
}

const buildMembersForDisplay = ({
  snapshotMembers,
  snapshotViewerRole,
  syncedMembers,
  viewerRole,
  viewerUserId,
}: {
  snapshotMembers: SettingsAdminSnapshot["members"]
  snapshotViewerRole: SettingsAdminWorkspaceRole
  syncedMembers: WorkspacePeopleSyncMember[]
  viewerRole: null | SettingsAdminWorkspaceRole
  viewerUserId: string
}): SettingsAdminMember[] => {
  const snapshotMembersById = new Map(
    snapshotMembers.map((member) => [member.id, member])
  )
  const snapshotOwnerCount = snapshotMembers.filter(
    (member) => member.role === "owner"
  ).length
  const ownerCount = syncedMembers.filter(
    (member) => member.role === "owner"
  ).length

  return syncedMembers.map((syncedMember) => {
    const snapshotMember = snapshotMembersById.get(syncedMember.id)

    if (!snapshotMember) {
      return {
        ...syncedMember,
        permissions: deriveMemberPermissions({
          member: syncedMember,
          ownerCount,
          viewerRole,
          viewerUserId,
        }),
      }
    }

    const shouldRecomputePermissions =
      viewerRole !== snapshotViewerRole ||
      ownerCount !== snapshotOwnerCount ||
      syncedMember.isCurrentUser !== snapshotMember.isCurrentUser ||
      syncedMember.role !== snapshotMember.role ||
      syncedMember.userId !== snapshotMember.userId

    return {
      ...snapshotMember,
      ...syncedMember,
      permissions: shouldRecomputePermissions
        ? deriveMemberPermissions({
            member: syncedMember,
            ownerCount,
            viewerRole,
            viewerUserId,
          })
        : snapshotMember.permissions,
    }
  })
}

const buildInvitesForDisplay = ({
  snapshotInvites,
  snapshotViewerRole,
  syncedInvites,
  viewerRole,
}: {
  snapshotInvites: SettingsAdminSnapshot["pendingInvites"]
  snapshotViewerRole: SettingsAdminWorkspaceRole
  syncedInvites: WorkspacePeopleSyncInvite[]
  viewerRole: null | SettingsAdminWorkspaceRole
}): SettingsAdminWorkspaceInvite[] => {
  const snapshotInvitesById = new Map(
    snapshotInvites.map((invite) => [invite.id, invite])
  )

  return syncedInvites.map((syncedInvite) => {
    const snapshotInvite = snapshotInvitesById.get(syncedInvite.id)

    if (!snapshotInvite) {
      return {
        ...syncedInvite,
        acceptUrl: "",
        permissions: deriveInvitePermissions({
          inviteRole: syncedInvite.role,
          viewerRole,
        }),
      }
    }

    const shouldRecomputePermissions =
      viewerRole !== snapshotViewerRole ||
      syncedInvite.role !== snapshotInvite.role ||
      syncedInvite.status !== snapshotInvite.status

    return {
      ...snapshotInvite,
      ...syncedInvite,
      acceptUrl: snapshotInvite.acceptUrl,
      permissions: shouldRecomputePermissions
        ? deriveInvitePermissions({
            inviteRole: syncedInvite.role,
            viewerRole,
          })
        : snapshotInvite.permissions,
    }
  })
}

const doMembersMatchSnapshot = ({
  snapshotMembers,
  syncedMembers,
}: {
  snapshotMembers: SettingsAdminSnapshot["members"]
  syncedMembers: WorkspacePeopleSyncMember[]
}) => {
  if (snapshotMembers.length !== syncedMembers.length) {
    return false
  }

  const syncedMembersById = new Map(
    syncedMembers.map((member) => [member.id, member])
  )

  return snapshotMembers.every((snapshotMember) => {
    const syncedMember = syncedMembersById.get(snapshotMember.id)

    return (
      syncedMember &&
      syncedMember.email === snapshotMember.email &&
      syncedMember.image === snapshotMember.image &&
      syncedMember.isCurrentUser === snapshotMember.isCurrentUser &&
      syncedMember.name === snapshotMember.name &&
      syncedMember.role === snapshotMember.role &&
      syncedMember.userId === snapshotMember.userId
    )
  })
}

const doInvitesMatchSnapshot = ({
  snapshotInvites,
  syncedInvites,
}: {
  snapshotInvites: SettingsAdminSnapshot["pendingInvites"]
  syncedInvites: WorkspacePeopleSyncInvite[]
}) => {
  if (snapshotInvites.length !== syncedInvites.length) {
    return false
  }

  const syncedInvitesById = new Map(
    syncedInvites.map((invite) => [invite.id, invite])
  )

  return snapshotInvites.every((snapshotInvite) => {
    const syncedInvite = syncedInvitesById.get(snapshotInvite.id)

    return (
      syncedInvite &&
      syncedInvite.code === snapshotInvite.code &&
      syncedInvite.email === snapshotInvite.email &&
      syncedInvite.role === snapshotInvite.role &&
      syncedInvite.status === snapshotInvite.status &&
      syncedInvite.workspaceId === snapshotInvite.workspaceId
    )
  })
}

const doesSyncMatchSnapshot = ({
  snapshot,
  syncData,
}: {
  snapshot: SettingsAdminSnapshot
  syncData: Pick<LoadedWorkspacePeopleSyncData, "invites" | "members">
}) =>
  doMembersMatchSnapshot({
    snapshotMembers: snapshot.members,
    syncedMembers: syncData.members,
  }) &&
  doInvitesMatchSnapshot({
    snapshotInvites: snapshot.pendingInvites,
    syncedInvites: syncData.invites,
  })

const PeopleSettingsPage = ({ snapshot }: PeopleSettingsPageProps) => {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [preferSnapshotRows, setPreferSnapshotRows] = useState(false)
  const isHydrated = useIsHydrated()
  const sync = useWorkspacePeopleSync()
  const syncInvites = sync.invites
  const syncMembers = sync.members
  const syncStatus = sync.status
  const isSyncForSnapshotWorkspace =
    sync.syncContext?.workspace.id === snapshot.workspaceProfile.id
  useEffect(() => {
    setPreferSnapshotRows(false)
  }, [snapshot.workspaceProfile.id])
  useEffect(() => {
    if (
      !preferSnapshotRows ||
      !isSyncForSnapshotWorkspace ||
      syncStatus !== "ready"
    ) {
      return
    }

    if (
      doesSyncMatchSnapshot({
        snapshot,
        syncData: {
          invites: syncInvites,
          members: syncMembers,
        },
      })
    ) {
      setPreferSnapshotRows(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setPreferSnapshotRows(false)
    }, SYNC_RECONCILIATION_FALLBACK_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    isSyncForSnapshotWorkspace,
    preferSnapshotRows,
    snapshot,
    syncInvites,
    syncMembers,
    syncStatus,
  ])
  const clearError = useEffectEvent(() => {
    setError(null)
  })
  const refreshSnapshot = useEffectEvent(async () => {
    setPreferSnapshotRows(true)

    try {
      await router.invalidate({ sync: true })
    } catch (nextError) {
      setPreferSnapshotRows(false)
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to refresh workspace people settings."
      )
    }
  })
  const shouldUseSyncRows =
    syncStatus === "ready" && isSyncForSnapshotWorkspace && !preferSnapshotRows
  const currentSyncContext =
    shouldUseSyncRows && sync.syncContext
      ? {
          userId: sync.syncContext.userId,
          viewerRole:
            syncMembers.find(
              (member) => member.userId === sync.syncContext?.userId
            )?.role ?? null,
        }
      : null
  let workspacePermissions = snapshot.permissions

  if (
    currentSyncContext &&
    currentSyncContext.viewerRole !== snapshot.viewerRole
  ) {
    workspacePermissions = deriveWorkspacePermissions({
      viewerRole: currentSyncContext.viewerRole,
    })
  }
  const members = currentSyncContext
    ? buildMembersForDisplay({
        snapshotMembers: snapshot.members,
        snapshotViewerRole: snapshot.viewerRole,
        syncedMembers: syncMembers,
        viewerRole: currentSyncContext.viewerRole,
        viewerUserId: currentSyncContext.userId,
      })
    : snapshot.members
  const pendingInvites = currentSyncContext
    ? buildInvitesForDisplay({
        snapshotInvites: snapshot.pendingInvites,
        snapshotViewerRole: snapshot.viewerRole,
        syncedInvites: syncInvites,
        viewerRole: currentSyncContext.viewerRole,
      })
    : snapshot.pendingInvites
  const isSyncLoading = syncStatus === "loading"
  const visibleError = error ?? (isSyncForSnapshotWorkspace ? sync.error : null)

  return (
    <div className="gap-4 flex flex-col">
      <Card className="bg-background/95">
        <CardHeader>
          <h2 className="text-2xl font-semibold tracking-tight">
            People settings
          </h2>
          <CardDescription>
            Members, roles, pending invites, and admin actions all live on one
            settings page.
          </CardDescription>
          <p className="text-sm text-muted-foreground">
            This workspace home also covers leave actions, with owner safeguards
            when the last owner still needs to stay on the team.
          </p>
        </CardHeader>
      </Card>
      {visibleError ? (
        <Alert variant="destructive">
          <AlertDescription>{visibleError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="gap-4 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)] grid">
        <Card className="bg-background/95">
          <CardHeader>
            <h3 className="text-lg font-semibold tracking-tight">
              Invite members
            </h3>
            <CardDescription>
              Send workspace invitations for the roles allowed by your current
              permissions snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteMemberForm
              canInviteRoles={workspacePermissions.canInviteRoles}
              disabled={
                !isHydrated ||
                isSyncLoading ||
                workspacePermissions.canInviteRoles.length === 0
              }
              onClearError={clearError}
              onError={setError}
              onRefresh={refreshSnapshot}
              workspaceId={snapshot.workspaceProfile.id}
            />
          </CardContent>
        </Card>
        <Card className="bg-background/95">
          <CardHeader>
            <h3 className="text-lg font-semibold tracking-tight">
              Workspace members
            </h3>
            <CardDescription>
              Role changes and removals are rendered exactly from the member
              permissions supplied by the backend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkspaceMembersTable
              disabled={!isHydrated || isSyncLoading}
              members={members}
              onClearError={clearError}
              onError={setError}
              onRefresh={refreshSnapshot}
              workspaceId={snapshot.workspaceProfile.id}
            />
          </CardContent>
        </Card>
      </div>
      <Card className="bg-background/95">
        <CardHeader>
          <h3 className="text-lg font-semibold tracking-tight">
            Pending invites
          </h3>
          <CardDescription>
            Resend and revoke actions are shown only when the invite row
            explicitly allows them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceInvitesTable
            disabled={!isHydrated || isSyncLoading}
            invites={pendingInvites}
            onClearError={clearError}
            onError={setError}
            onRefresh={refreshSnapshot}
            workspaceId={snapshot.workspaceProfile.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export { PeopleSettingsPage }
