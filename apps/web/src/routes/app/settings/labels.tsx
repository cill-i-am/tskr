import { requireAdminSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import { createFileRoute } from "@tanstack/react-router"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"
const LabelsSettingsRoute = () => (
  <Card className="bg-background/95">
    <CardHeader>
      <h2 className="text-2xl font-semibold tracking-tight">Labels</h2>
      <CardDescription>
        Placeholder route for future workspace label administration.
      </CardDescription>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground">
      Labels settings are intentionally stubbed in this task.
    </CardContent>
  </Card>
)

export const Route = createFileRoute("/app/settings/labels")({
  component: LabelsSettingsRoute,
  loader: requireAdminSettingsAccess,
})
