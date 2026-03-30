import { requireAccountSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import { AccountSettingsPage } from "@/domains/identity/settings-admin/ui/account-settings-page"
import { createFileRoute, useLoaderData } from "@tanstack/react-router"

const AccountSettingsRoute = () => {
  const { accountProfile } = useLoaderData({
    from: "/app/settings/account",
  })

  return <AccountSettingsPage accountProfile={accountProfile} />
}

export const Route = createFileRoute("/app/settings/account")({
  component: AccountSettingsRoute,
  loader: requireAccountSettingsAccess,
})
