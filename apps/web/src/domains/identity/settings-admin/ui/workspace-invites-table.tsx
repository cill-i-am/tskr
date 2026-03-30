import type { SettingsAdminWorkspaceInvite } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { resendWorkspaceInvite } from "@/domains/identity/settings-admin/infra/resend-workspace-invite"
import { revokeWorkspaceInvite } from "@/domains/identity/settings-admin/infra/revoke-workspace-invite"
import { getWorkspaceRoleLabel } from "@/domains/workspaces/shared/workspace-role-labels"
import { useEffect, useEffectEvent, useRef, useState } from "react"
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

const getCopyActionKey = (inviteId: string, copyTarget: string) =>
  `${inviteId}:${copyTarget}`

interface WorkspaceInviteCopyButtonProps {
  copied: boolean
  copyTarget: "code" | "link"
  invite: SettingsAdminWorkspaceInvite
  onClearError: () => void
  onCopied: (key: string) => void
  onError: (message: string) => void
}

const WorkspaceInviteCopyButton = ({
  copied,
  copyTarget,
  invite,
  onClearError,
  onCopied,
  onError,
}: WorkspaceInviteCopyButtonProps) => {
  const handleClick = useEffectEvent(async () => {
    onClearError()

    const textToCopy = copyTarget === "code" ? invite.code : invite.acceptUrl
    const errorMessage =
      copyTarget === "code"
        ? "Unable to copy the invite code."
        : "Unable to copy the accept link."

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error(errorMessage)
      }

      await navigator.clipboard.writeText(textToCopy)
      onCopied(getCopyActionKey(invite.id, copyTarget))
    } catch {
      onError(errorMessage)
    }
  })
  const noun = copyTarget === "code" ? "invite code" : "accept link"
  const buttonLabel = copied ? "Copied" : `Copy ${noun}`
  const ariaLabel = copied
    ? `${noun[0].toUpperCase()}${noun.slice(1)} copied`
    : `Copy ${noun}`

  return (
    <Button
      aria-label={ariaLabel}
      onClick={handleClick}
      size="sm"
      type="button"
      variant="outline"
    >
      {buttonLabel}
    </Button>
  )
}

interface WorkspaceInvitesTableProps {
  invites: SettingsAdminWorkspaceInvite[]
  onClearError: () => void
  onError: (message: string) => void
  onRefresh: () => Promise<void>
  workspaceId: string
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
  const [copiedInviteActions, setCopiedInviteActions] = useState<
    Record<string, true>
  >({})
  const copyTimeoutIds = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const timeoutIds = copyTimeoutIds.current

    return () => {
      for (const timeoutId of timeoutIds.values()) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  const clearCopiedInviteAction = useEffectEvent((key: string) => {
    setCopiedInviteActions((current) => {
      if (!current[key]) {
        return current
      }

      const { [key]: _clearedInviteAction, ...next } = current

      return next
    })

    const timeoutId = copyTimeoutIds.current.get(key)

    if (timeoutId) {
      window.clearTimeout(timeoutId)
      copyTimeoutIds.current.delete(key)
    }
  })

  const markCopiedInviteAction = useEffectEvent((key: string) => {
    const existingTimeoutId = copyTimeoutIds.current.get(key)

    if (existingTimeoutId) {
      window.clearTimeout(existingTimeoutId)
    }

    setCopiedInviteActions((current) => ({
      ...current,
      [key]: true,
    }))

    copyTimeoutIds.current.set(
      key,
      window.setTimeout(() => {
        clearCopiedInviteAction(key)
      }, 1500)
    )
  })

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
          <TableHead>Invite details</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-full">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invites.map((invite) => {
          const isPending = pendingInviteIds.has(invite.id)
          const canManageInvite =
            invite.permissions.canResend || invite.permissions.canRevoke
          const codeCopyKey = getCopyActionKey(invite.id, "code")
          const linkCopyKey = getCopyActionKey(invite.id, "link")
          const isCodeCopied = copiedInviteActions[codeCopyKey]
          const isLinkCopied = copiedInviteActions[linkCopyKey]

          return (
            <TableRow key={invite.id}>
              <TableCell>
                <div className="min-w-0 gap-2 flex flex-col">
                  <p className="font-medium">{invite.email}</p>
                  {canManageInvite ? (
                    <div className="min-w-0 gap-1 text-sm flex flex-col text-muted-foreground">
                      <div className="gap-2 flex flex-wrap items-center">
                        <span className="text-xs tracking-wide uppercase">
                          Code
                        </span>
                        <span className="font-mono break-all">
                          {invite.code}
                        </span>
                        <WorkspaceInviteCopyButton
                          copied={isCodeCopied}
                          copyTarget="code"
                          invite={invite}
                          onClearError={onClearError}
                          onCopied={markCopiedInviteAction}
                          onError={onError}
                        />
                      </div>
                      <div className="gap-2 flex flex-wrap items-center">
                        <span className="text-xs tracking-wide uppercase">
                          Accept link
                        </span>
                        <a
                          className="break-all"
                          href={invite.acceptUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open accept link
                        </a>
                        <WorkspaceInviteCopyButton
                          copied={isLinkCopied}
                          copyTarget="link"
                          invite={invite}
                          onClearError={onClearError}
                          onCopied={markCopiedInviteAction}
                          onError={onError}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{getWorkspaceRoleLabel(invite.role)}</TableCell>
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
