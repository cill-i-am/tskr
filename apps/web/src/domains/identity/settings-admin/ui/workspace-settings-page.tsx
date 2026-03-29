import type { SettingsAdminSnapshot } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { useWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/ui/use-workspace-bootstrap"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"

import { WorkspaceProfileForm } from "./workspace-profile-form"

interface WorkspaceSettingsPageProps {
  snapshot: SettingsAdminSnapshot
}

const WorkspaceSettingsPage = ({ snapshot }: WorkspaceSettingsPageProps) => {
  const { activeWorkspace } = useWorkspaceBootstrap()

  return (
    <Card className="bg-background/95">
      <CardHeader>
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Available now
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Workspace settings
        </h2>
        <CardDescription>
          Admin controls for{" "}
          {activeWorkspace?.name ?? snapshot.workspaceProfile.name}.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4 flex flex-col">
        <WorkspaceProfileForm
          key={`${snapshot.workspaceProfile.name}|${snapshot.workspaceProfile.logo ?? ""}`}
          workspaceProfile={snapshot.workspaceProfile}
        />
      </CardContent>
    </Card>
  )
}

export { WorkspaceSettingsPage }
