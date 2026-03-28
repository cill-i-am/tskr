import { useWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/ui/use-workspace-bootstrap"
import { createFileRoute, useLoaderData } from "@tanstack/react-router"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"

const AccountSettingsRoute = () => {
  const { activeWorkspace } = useWorkspaceBootstrap()
  const { snapshot } = useLoaderData({ from: "/app/settings" })

  return (
    <Card className="bg-background/95">
      <CardHeader>
        <h2 className="text-2xl font-semibold tracking-tight">
          Account settings
        </h2>
        <CardDescription>
          Manage how you appear in {activeWorkspace?.name ?? "your workspace"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3 text-sm flex flex-col text-muted-foreground">
        <p>
          This route stays available for any authenticated member with an active
          workspace session.
        </p>
        <p>
          {snapshot
            ? `Profile details are loaded for ${snapshot.accountProfile.email}.`
            : "Workspace-admin settings remain hidden until your role allows them."}
        </p>
      </CardContent>
    </Card>
  )
}

export const Route = createFileRoute("/app/settings/account")({
  component: AccountSettingsRoute,
})
