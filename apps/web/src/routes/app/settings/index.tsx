import { requireWorkspaceAdminSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import { SettingsOverviewPage } from "@/domains/identity/settings-admin/ui/settings-overview-page"
import { createFileRoute, useLoaderData } from "@tanstack/react-router"

const SettingsOverviewRoute = () => {
  const { snapshot } = useLoaderData({ from: "/app/settings" })

  if (!snapshot) {
    return null
  }

  return <SettingsOverviewPage snapshot={snapshot} />
}

export const Route = createFileRoute("/app/settings/")({
  component: SettingsOverviewRoute,
  loader: requireWorkspaceAdminSettingsAccess,
})
