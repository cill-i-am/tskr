"use client"

import { useWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/ui/use-workspace-bootstrap"
import { useRouter } from "@tanstack/react-router"
import { ChevronDownIcon, RefreshCcwIcon } from "lucide-react"
import { useId, useState } from "react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"

import { useSwitchActiveWorkspace } from "./use-switch-active-workspace"
import { WorkspaceAccessPanel } from "./workspace-access-panel"

const WorkspaceSwitcher = () => {
  const router = useRouter()
  const { activeWorkspace, memberships, pendingInvites } =
    useWorkspaceBootstrap()
  const summaryId = useId()
  const triggerLabelId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const { error, switchWorkspace, switchingWorkspaceId } =
    useSwitchActiveWorkspace({
      fallbackErrorMessage: "Unable to switch workspaces.",
      onSuccess: async () => {
        await router.invalidate({ sync: true })
        setIsOpen(false)
      },
    })

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <CollapsibleTrigger
        aria-labelledby={`${triggerLabelId} ${summaryId}`}
        render={<Button className="w-full justify-between" variant="outline" />}
      >
        <span className="sr-only" id={triggerLabelId}>
          Switch workspace
        </span>
        <span className="gap-2 min-w-0 flex items-center">
          <RefreshCcwIcon data-icon="inline-start" />
          <span className="min-w-0 text-left" id={summaryId}>
            <span className="font-medium block truncate">
              {activeWorkspace?.name ?? "Workspace access"}
            </span>
            <span className="text-xs block text-muted-foreground">
              {memberships.length} memberships available
            </span>
          </span>
        </span>
        <ChevronDownIcon data-icon="inline-end" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card
          className="mt-2 gap-0 bg-background/95"
          data-workspace-switcher-panel=""
          size="sm"
        >
          <CardHeader>
            <CardTitle>Workspace access</CardTitle>
            <CardDescription>
              Move between memberships without leaving the app shell.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3 pb-3 flex flex-col">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
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
      </CollapsibleContent>
    </Collapsible>
  )
}

export { WorkspaceSwitcher }
