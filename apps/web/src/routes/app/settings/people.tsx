import { requireAdminSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import { createFileRoute, useLoaderData } from "@tanstack/react-router"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"
const PeopleSettingsRoute = () => {
  const { snapshot } = useLoaderData({ from: "/app/settings" })

  return (
    <Card className="bg-background/95">
      <CardHeader>
        <h2 className="text-2xl font-semibold tracking-tight">
          People settings
        </h2>
        <CardDescription>
          Manage {snapshot?.members.length ?? 0} workspace members and invites.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3 text-sm flex flex-col text-muted-foreground">
        <p>This route is reserved for owner and admin workspace roles.</p>
        <p>People management forms will mount here in the next task.</p>
      </CardContent>
    </Card>
  )
}

export const Route = createFileRoute("/app/settings/people")({
  component: PeopleSettingsRoute,
  loader: requireAdminSettingsAccess,
})
