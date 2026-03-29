import { AccountSettingsPage } from "@/domains/identity/settings-admin/ui/account-settings-page"
import { createFileRoute, useLoaderData } from "@tanstack/react-router"

const AccountSettingsRoute = () => {
  const { snapshot } = useLoaderData({ from: "/app/settings" })

  return <AccountSettingsPage snapshot={snapshot} />
}

export const Route = createFileRoute("/app/settings/account")({
  component: AccountSettingsRoute,
})
