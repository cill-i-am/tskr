import { requireWorkspaceProfileSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import { createFileRoute, useLoaderData } from "@tanstack/react-router"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"
const WorkspaceSettingsRoute = () => {
  const { snapshot } = useLoaderData({ from: "/app/settings" })

  return (
    <Card className="bg-background/95">
      <CardHeader>
        <h2 className="text-2xl font-semibold tracking-tight">
          Workspace settings
        </h2>
        <CardDescription>
          Admin controls for{" "}
          {snapshot?.workspaceProfile.name ?? "this workspace"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3 text-sm flex flex-col text-muted-foreground">
        <p>Workspace profile editing will attach to this route next.</p>
        <p>Current slug: {snapshot?.workspaceProfile.slug ?? "Unavailable"}</p>
      </CardContent>
    </Card>
  )
}

export const Route = createFileRoute("/app/settings/workspace")({
  component: WorkspaceSettingsRoute,
  loader: requireWorkspaceProfileSettingsAccess,
})
