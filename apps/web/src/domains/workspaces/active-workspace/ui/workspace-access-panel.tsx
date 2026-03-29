import type {
  PendingWorkspaceInvite,
  WorkspaceMembership,
} from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { getWorkspaceRoleLabel } from "@/domains/workspaces/shared/workspace-role-labels"
import { useEffectEvent } from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Separator } from "@workspace/ui/components/separator"

interface WorkspaceAccessPanelProps {
  activeWorkspaceId: string | null
  memberships: WorkspaceMembership[]
  onSelectWorkspace: (workspaceId: string) => void | Promise<void>
  pendingInvites: PendingWorkspaceInvite[]
  switchingWorkspaceId: string | null
}

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "WS"

const WorkspaceMembershipEntry = ({
  activeWorkspaceId,
  membership,
  onSelectWorkspace,
  switchingWorkspaceId,
}: {
  activeWorkspaceId: string | null
  membership: WorkspaceMembership
  onSelectWorkspace: (workspaceId: string) => void | Promise<void>
  switchingWorkspaceId: string | null
}) => {
  const isActive = membership.id === activeWorkspaceId
  const isSwitching = membership.id === switchingWorkspaceId
  let actionLabel = `Switch to ${membership.name}`

  if (isActive) {
    actionLabel = "Active workspace"
  } else if (isSwitching) {
    actionLabel = `Switching to ${membership.name}...`
  }

  const handleSelectWorkspace = useEffectEvent(async () => {
    await onSelectWorkspace(membership.id)
  })

  return (
    <div
      data-workspace-entry={membership.id}
      className={
        isActive
          ? "gap-3 px-3 py-3 flex items-center justify-between rounded-xl border bg-muted/40"
          : "gap-3 px-3 py-3 flex items-center justify-between rounded-xl border border-transparent"
      }
    >
      <div className="gap-3 min-w-0 flex items-center">
        <Avatar size="sm">
          {membership.logo ? (
            <AvatarImage alt="" src={membership.logo} />
          ) : null}
          <AvatarFallback>{getInitials(membership.name)}</AvatarFallback>
        </Avatar>
        <div className="gap-1 min-w-0 flex flex-col">
          <div className="gap-2 min-w-0 flex items-center">
            <p className="font-medium truncate">{membership.name}</p>
            {isActive ? (
              <Badge className="shrink-0" variant="secondary">
                Active workspace
              </Badge>
            ) : null}
          </div>
          <div className="gap-2 min-w-0 flex items-center">
            <Badge variant="outline">
              {getWorkspaceRoleLabel(membership.role)}
            </Badge>
            <p className="text-xs truncate text-muted-foreground">
              {membership.slug}
            </p>
          </div>
        </div>
      </div>
      <Button
        disabled={isActive || switchingWorkspaceId !== null}
        onClick={handleSelectWorkspace}
        size="sm"
        variant={isActive ? "secondary" : "outline"}
      >
        {actionLabel}
      </Button>
    </div>
  )
}

const WorkspaceInviteEntry = ({
  invite,
}: {
  invite: PendingWorkspaceInvite
}) => (
  <div
    className="gap-3 px-3 py-3 flex items-center rounded-xl border border-dashed"
    data-workspace-invite={invite.id}
  >
    <Avatar size="sm">
      <AvatarFallback>{getInitials(invite.workspaceName)}</AvatarFallback>
    </Avatar>
    <div className="gap-1 min-w-0 flex flex-1 flex-col">
      <div className="gap-2 min-w-0 flex items-center">
        <p className="font-medium truncate">{invite.workspaceName}</p>
        <Badge variant="outline">{getWorkspaceRoleLabel(invite.role)}</Badge>
      </div>
      <p className="text-xs truncate text-muted-foreground">{invite.email}</p>
    </div>
  </div>
)

const WorkspaceAccessPanel = ({
  activeWorkspaceId,
  memberships,
  onSelectWorkspace,
  pendingInvites,
  switchingWorkspaceId,
}: WorkspaceAccessPanelProps) => (
  <div className="gap-4 flex flex-col">
    <div className="gap-2 flex flex-col">
      {memberships.map((membership) => (
        <WorkspaceMembershipEntry
          activeWorkspaceId={activeWorkspaceId}
          key={membership.id}
          membership={membership}
          onSelectWorkspace={onSelectWorkspace}
          switchingWorkspaceId={switchingWorkspaceId}
        />
      ))}
    </div>
    <Separator />
    <div className="gap-3 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h3 className="font-medium">Pending invites</h3>
        <p className="text-xs text-muted-foreground">
          Invitations appear here until you accept them.
        </p>
      </div>
      {pendingInvites.length === 0 ? (
        <Empty className="px-3 py-6">
          <EmptyHeader>
            <EmptyTitle>No pending invites</EmptyTitle>
            <EmptyDescription>
              New workspace invitations will show up here as they arrive.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="gap-2 flex flex-col">
          {pendingInvites.map((invite) => (
            <WorkspaceInviteEntry invite={invite} key={invite.id} />
          ))}
        </div>
      )}
    </div>
  </div>
)

export { WorkspaceAccessPanel }
