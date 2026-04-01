import { requireWorkspaceAdminSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import {
  SettingsStubPage,
  settingsStubPages,
} from "@/domains/identity/settings-admin/ui/settings-stub-pages"
import { createFileRoute } from "@tanstack/react-router"

const LabelsSettingsRoute = () => (
  <SettingsStubPage page={settingsStubPages[0]} />
)

export const Route = createFileRoute("/app/settings/labels")({
  component: LabelsSettingsRoute,
  loader: ({ parentMatchPromise }) =>
    requireWorkspaceAdminSettingsAccess({ parentMatchPromise }),
})
