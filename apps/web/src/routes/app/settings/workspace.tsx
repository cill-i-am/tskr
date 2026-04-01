import { requireWorkspaceProfileSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import { WorkspaceSettingsPage } from "@/domains/identity/settings-admin/ui/workspace-settings-page"
import { createFileRoute, useLoaderData } from "@tanstack/react-router"

const WorkspaceSettingsRoute = () => {
  const { snapshot } = useLoaderData({ from: "/app/settings/workspace" })

  return <WorkspaceSettingsPage snapshot={snapshot} />
}

export const Route = createFileRoute("/app/settings/workspace")({
  component: WorkspaceSettingsRoute,
  loader: ({ parentMatchPromise }) =>
    requireWorkspaceProfileSettingsAccess({ parentMatchPromise }),
})
