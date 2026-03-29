"use client"

import { useWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/ui/use-workspace-bootstrap"
import { useNavigate } from "@tanstack/react-router"
import { useTransition } from "react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

import { useSwitchActiveWorkspace } from "./use-switch-active-workspace"
import { WorkspaceAccessPanel } from "./workspace-access-panel"

const WorkspaceSelectionRecovery = () => {
  const navigate = useNavigate()
  const { activeWorkspace, memberships, pendingInvites } =
    useWorkspaceBootstrap()
  const [, startTransition] = useTransition()
  const { error, switchWorkspace, switchingWorkspaceId } =
    useSwitchActiveWorkspace({
      fallbackErrorMessage: "Unable to recover workspace access.",
      keepLockedOnSuccess: true,
      onSuccess: () => {
        startTransition(() => {
          navigate({
            to: "/app",
          })
        })
      },
    })

  return (
    <div className="p-6 md:p-10 flex min-h-svh items-center justify-center">
      <Card className="max-w-2xl w-full bg-background/95">
        <CardHeader>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Workspace recovery
          </p>
          <h1 className="text-3xl font-medium tracking-tight">
            Your previous active workspace is no longer available
          </h1>
          <CardDescription>Choose where to continue.</CardDescription>
        </CardHeader>
        <CardContent className="gap-4 flex flex-col">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {memberships.length === 0 ? (
            <Empty className="px-3 py-6">
              <EmptyHeader>
                <EmptyTitle>No workspaces available yet</EmptyTitle>
                <EmptyDescription>
                  Your previous active workspace is gone, and there is nothing
                  to continue in yet. Check your invites or ask an admin for
                  access.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          <WorkspaceAccessPanel
            activeWorkspaceId={activeWorkspace?.id ?? null}
            memberships={memberships}
            onSelectWorkspace={switchWorkspace}
            pendingInvites={pendingInvites}
            switchingWorkspaceId={switchingWorkspaceId}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export { WorkspaceSelectionRecovery }
