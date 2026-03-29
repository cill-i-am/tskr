import { requireWorkspaceAdminSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import {
  SettingsStubPage,
  settingsStubPages,
} from "@/domains/identity/settings-admin/ui/settings-stub-pages"
import { createFileRoute } from "@tanstack/react-router"

const NotificationsSettingsRoute = () => (
  <SettingsStubPage page={settingsStubPages[2]} />
)

export const Route = createFileRoute("/app/settings/notifications")({
  component: NotificationsSettingsRoute,
  loader: requireWorkspaceAdminSettingsAccess,
})
