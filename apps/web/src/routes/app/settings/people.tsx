import { requirePeopleSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import { WorkspacePeopleSyncProvider } from "@/domains/identity/settings-admin/infra/sync/workspace-people-sync"
import { PeopleSettingsPage } from "@/domains/identity/settings-admin/ui/people-settings-page"
import { createFileRoute, useLoaderData } from "@tanstack/react-router"

const PeopleSettingsRoute = () => {
  const { snapshot } = useLoaderData({ from: "/app/settings/people" })

  return (
    <WorkspacePeopleSyncProvider
      memberProfiles={snapshot.members}
      workspaceId={snapshot.workspaceProfile.id}
    >
      <PeopleSettingsPage snapshot={snapshot} />
    </WorkspacePeopleSyncProvider>
  )
}

export const Route = createFileRoute("/app/settings/people")({
  component: PeopleSettingsRoute,
  loader: ({ parentMatchPromise }) =>
    requirePeopleSettingsAccess({ parentMatchPromise }),
})
