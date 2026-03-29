import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

interface WorkspaceRecoveryNoticeProps {
  activeWorkspaceName: string | null
  recoveryState: WorkspaceBootstrap["recoveryState"]
}

const WorkspaceRecoveryNotice = ({
  activeWorkspaceName,
  recoveryState,
}: WorkspaceRecoveryNoticeProps) => {
  if (recoveryState !== "auto_switched" || !activeWorkspaceName) {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Workspace access updated</CardTitle>
        <CardDescription>
          We kept you moving by choosing a workspace you can still access.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        We moved you into {activeWorkspaceName} because your previous workspace
        was no longer available.
      </CardContent>
    </Card>
  )
}

export { WorkspaceRecoveryNotice }
