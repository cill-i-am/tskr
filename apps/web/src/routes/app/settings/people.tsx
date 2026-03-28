import { requirePeopleSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import { PeopleSettingsPage } from "@/domains/identity/settings-admin/ui/people-settings-page"
import { createFileRoute, useLoaderData } from "@tanstack/react-router"

const PeopleSettingsRoute = () => {
  const { snapshot } = useLoaderData({ from: "/app/settings" })

  if (!snapshot) {
    return null
  }

  return <PeopleSettingsPage snapshot={snapshot} />
}

export const Route = createFileRoute("/app/settings/people")({
  component: PeopleSettingsRoute,
  loader: requirePeopleSettingsAccess,
})
