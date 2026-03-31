import type {
  SettingsAdminMember,
  SettingsAdminWorkspaceRole,
} from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { removeWorkspaceMember } from "@/domains/identity/settings-admin/infra/remove-workspace-member"
import { updateWorkspaceMemberRole } from "@/domains/identity/settings-admin/infra/update-workspace-member-role"
import { getWorkspaceRoleLabel } from "@/domains/workspaces/shared/workspace-role-labels"
import { useEffect, useEffectEvent, useState } from "react"
import type { ChangeEvent, MouseEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

interface WorkspaceMembersTableProps {
  disabled: boolean
  members: SettingsAdminMember[]
  onClearError: () => void
  onError: (message: string) => void
  onRefresh: () => Promise<void>
  workspaceId: string
}

const getDraftRoles = (members: SettingsAdminMember[]) =>
  Object.fromEntries(
    members.map((member) => [
      member.id,
      member.permissions.canChangeRole
        ? member.role
        : ("" as SettingsAdminWorkspaceRole | ""),
    ])
  )

const getRoleOptions = (member: SettingsAdminMember) => [
  ...new Set([member.role, ...member.permissions.assignableRoles]),
]

const WorkspaceMembersTable = ({
  disabled,
  members,
  onClearError,
  onError,
  onRefresh,
  workspaceId,
}: WorkspaceMembersTableProps) => {
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>(
    getDraftRoles(members)
  )
  const [pendingMemberIds, setPendingMemberIds] = useState<Set<string>>(
    () => new Set()
  )

  useEffect(() => {
    setDraftRoles(getDraftRoles(members))
  }, [members])

  const handleDraftRoleChange = useEffectEvent(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const { memberId } = event.currentTarget.dataset

      if (!memberId) {
        return
      }

      setDraftRoles((current) => ({
        ...current,
        [memberId]: event.target.value,
      }))
    }
  )

  const handleRoleSave = useEffectEvent(
    async (event: MouseEvent<HTMLButtonElement>) => {
      const { memberId } = event.currentTarget.dataset

      if (!memberId) {
        return
      }

      const member = members.find((candidate) => candidate.id === memberId)

      if (!member) {
        return
      }

      const nextRole = draftRoles[member.id]

      if (!nextRole || nextRole === member.role) {
        return
      }

      onClearError()
      setPendingMemberIds((current) => new Set(current).add(member.id))

      try {
        await updateWorkspaceMemberRole({
          memberId: member.id,
          role: nextRole as SettingsAdminWorkspaceRole,
          workspaceId,
        })
        await onRefresh()
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Unable to update the workspace member role."
        )
      } finally {
        setPendingMemberIds((current) => {
          const next = new Set(current)
          next.delete(member.id)
          return next
        })
      }
    }
  )

  const handleRemove = useEffectEvent(
    async (event: MouseEvent<HTMLButtonElement>) => {
      const { memberId } = event.currentTarget.dataset

      if (!memberId) {
        return
      }

      const member = members.find((candidate) => candidate.id === memberId)

      if (!member) {
        return
      }

      onClearError()
      setPendingMemberIds((current) => new Set(current).add(member.id))

      try {
        await removeWorkspaceMember({
          memberId: member.id,
          workspaceId,
        })
        await onRefresh()
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Unable to update the workspace membership."
        )
      } finally {
        setPendingMemberIds((current) => {
          const next = new Set(current)
          next.delete(member.id)
          return next
        })
      }
    }
  )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="w-full">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => {
          const isPending = pendingMemberIds.has(member.id)
          const canLeaveWorkspace =
            member.isCurrentUser && member.permissions.canRemove
          const isProtectedOwner =
            member.isCurrentUser &&
            !member.permissions.canRemove &&
            member.role === "owner"
          const removeLabel = member.isCurrentUser
            ? "Leave workspace"
            : `Remove ${member.name}`

          return (
            <TableRow key={member.id}>
              <TableCell>
                <div className="min-w-0">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.email}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                {member.permissions.canChangeRole ? (
                  <NativeSelect
                    aria-label={`Role for ${member.name}`}
                    data-member-id={member.id}
                    disabled={disabled || isPending}
                    onChange={handleDraftRoleChange}
                    value={draftRoles[member.id] ?? member.role}
                  >
                    {getRoleOptions(member).map((role) => (
                      <NativeSelectOption key={role} value={role}>
                        {getWorkspaceRoleLabel(role)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : (
                  <span>{getWorkspaceRoleLabel(member.role)}</span>
                )}
              </TableCell>
              <TableCell>
                <div className="gap-1 flex flex-col items-end">
                  <div className="gap-2 flex flex-wrap justify-end">
                    {member.permissions.canChangeRole ? (
                      <Button
                        data-member-id={member.id}
                        disabled={
                          disabled ||
                          isPending ||
                          draftRoles[member.id] === member.role
                        }
                        onClick={handleRoleSave}
                        size="sm"
                        type="button"
                      >
                        {`Save role for ${member.name}`}
                      </Button>
                    ) : null}
                    {member.permissions.canRemove ? (
                      <Button
                        data-member-id={member.id}
                        disabled={disabled || isPending}
                        onClick={handleRemove}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {removeLabel}
                      </Button>
                    ) : null}
                  </div>
                  {canLeaveWorkspace ? (
                    <p className="text-sm text-right text-muted-foreground">
                      Leaving removes workspace access immediately.
                    </p>
                  ) : null}
                  {isProtectedOwner ? (
                    <p className="text-sm text-right text-muted-foreground">
                      Add or transfer another owner before leaving.
                    </p>
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

export { WorkspaceMembersTable }
