import { hasPeopleSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import { WorkspacePeopleSyncProvider } from "@/domains/identity/settings-admin/infra/sync/workspace-people-sync"
import { PeopleSettingsPage } from "@/domains/identity/settings-admin/ui/people-settings-page"
import {
  createFileRoute,
  useLoaderData,
  useNavigate,
} from "@tanstack/react-router"
import { useEffect } from "react"

const PeopleSettingsRoute = () => {
  const navigate = useNavigate()
  const { snapshot } = useLoaderData({ from: "/app/settings" })
  const hasAccess =
    snapshot !== null && hasPeopleSettingsAccess(snapshot.permissions)

  useEffect(() => {
    if (hasAccess) {
      return
    }

    navigate({
      replace: true,
      to: "/app/settings/account",
    })
  }, [hasAccess, navigate])

  if (!snapshot || !hasAccess) {
    return null
  }

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
})
