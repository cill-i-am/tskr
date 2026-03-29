import { requireWorkspaceAdminSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import {
  SettingsStubPage,
  settingsStubPages,
} from "@/domains/identity/settings-admin/ui/settings-stub-pages"
import { createFileRoute } from "@tanstack/react-router"

const ServiceZonesSettingsRoute = () => (
  <SettingsStubPage page={settingsStubPages[1]} />
)

export const Route = createFileRoute("/app/settings/service-zones")({
  component: ServiceZonesSettingsRoute,
  loader: requireWorkspaceAdminSettingsAccess,
})
