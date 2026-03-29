import type {
  SettingsAdminWorkspaceInvite,
  SettingsAdminWorkspaceRole,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { resendWorkspaceInvite } from "@/domains/identity/settings-admin/infra/resend-workspace-invite"
import { revokeWorkspaceInvite } from "@/domains/identity/settings-admin/infra/revoke-workspace-invite"
import { useEffectEvent, useState } from "react"
import type { MouseEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

interface WorkspaceInvitesTableProps {
  invites: SettingsAdminWorkspaceInvite[]
  onClearError: () => void
  onError: (message: string) => void
  onRefresh: () => Promise<void>
  workspaceId: string
}

const roleLabels: Record<SettingsAdminWorkspaceRole, string> = {
  admin: "Admin",
  dispatcher: "Dispatcher",
  field_worker: "Field worker",
  owner: "Owner",
}

const WorkspaceInvitesTable = ({
  invites,
  onClearError,
  onError,
  onRefresh,
  workspaceId,
}: WorkspaceInvitesTableProps) => {
  const [pendingInviteIds, setPendingInviteIds] = useState<Set<string>>(
    () => new Set()
  )

  const handleResend = useEffectEvent(
    async (event: MouseEvent<HTMLButtonElement>) => {
      const { inviteId } = event.currentTarget.dataset

      if (!inviteId) {
        return
      }

      const invite = invites.find((candidate) => candidate.id === inviteId)

      if (!invite) {
        return
      }

      onClearError()
      setPendingInviteIds((current) => new Set(current).add(invite.id))

      try {
        await resendWorkspaceInvite({
          inviteId: invite.id,
          workspaceId,
        })
        await onRefresh()
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Unable to resend the workspace invite."
        )
      } finally {
        setPendingInviteIds((current) => {
          const next = new Set(current)
          next.delete(invite.id)
          return next
        })
      }
    }
  )

  const handleRevoke = useEffectEvent(
    async (event: MouseEvent<HTMLButtonElement>) => {
      const { inviteId } = event.currentTarget.dataset

      if (!inviteId) {
        return
      }

      const invite = invites.find((candidate) => candidate.id === inviteId)

      if (!invite) {
        return
      }

      onClearError()
      setPendingInviteIds((current) => new Set(current).add(invite.id))

      try {
        await revokeWorkspaceInvite({
          inviteId: invite.id,
          workspaceId,
        })
        await onRefresh()
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Unable to revoke the workspace invite."
        )
      } finally {
        setPendingInviteIds((current) => {
          const next = new Set(current)
          next.delete(invite.id)
          return next
        })
      }
    }
  )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-full">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invites.map((invite) => {
          const isPending = pendingInviteIds.has(invite.id)

          return (
            <TableRow key={invite.id}>
              <TableCell>{invite.email}</TableCell>
              <TableCell>{roleLabels[invite.role]}</TableCell>
              <TableCell className="capitalize">{invite.status}</TableCell>
              <TableCell>
                <div className="gap-2 flex flex-wrap justify-end">
                  {invite.permissions.canResend ? (
                    <Button
                      data-invite-id={invite.id}
                      disabled={isPending}
                      onClick={handleResend}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {`Resend invite to ${invite.email}`}
                    </Button>
                  ) : null}
                  {invite.permissions.canRevoke ? (
                    <Button
                      data-invite-id={invite.id}
                      disabled={isPending}
                      onClick={handleRevoke}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {`Revoke invite for ${invite.email}`}
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export { WorkspaceInvitesTable }
