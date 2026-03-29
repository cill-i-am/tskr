import { loadSettingsRouteData } from "@/domains/identity/settings-admin/application/settings-route-access"
import { SettingsLayout } from "@/domains/identity/settings-admin/ui/settings-layout"
import { Outlet, createFileRoute, useLoaderData } from "@tanstack/react-router"

const SettingsLayoutRoute = () => {
  const loaderData = useLoaderData({ from: "/app/settings" })

  return (
    <SettingsLayout snapshot={loaderData.snapshot}>
      <Outlet />
    </SettingsLayout>
  )
}

export const Route = createFileRoute("/app/settings")({
  component: SettingsLayoutRoute,
  loader: loadSettingsRouteData,
})
