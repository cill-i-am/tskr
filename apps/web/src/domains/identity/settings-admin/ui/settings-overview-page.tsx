import type { SettingsAdminSnapshot } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { Link } from "@tanstack/react-router"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"

interface SettingsOverviewPageProps {
  snapshot: SettingsAdminSnapshot
}

const overviewCards = (snapshot: SettingsAdminSnapshot) => [
  {
    description: `Signed in as ${snapshot.accountProfile.email}.`,
    href: "/app/settings/account",
    title: "Account",
  },
  {
    description: `Workspace profile: ${snapshot.workspaceProfile.name}.`,
    href: "/app/settings/workspace",
    title: "Workspace",
  },
  {
    description: `${snapshot.members.length} member records ready for admin management.`,
    href: "/app/settings/people",
    title: "People",
  },
  {
    description: "Labels settings are scaffolded and ready for future forms.",
    href: "/app/settings/labels",
    title: "Labels",
  },
  {
    description: "Service zones currently expose a placeholder admin route.",
    href: "/app/settings/service-zones",
    title: "Service zones",
  },
  {
    description: "Notification controls will attach to this shell next.",
    href: "/app/settings/notifications",
    title: "Notifications",
  },
]

const SettingsOverviewPage = ({ snapshot }: SettingsOverviewPageProps) => (
  <div className="gap-4 md:grid-cols-2 xl:grid-cols-3 grid">
    {overviewCards(snapshot).map((card) => (
      <Card className="bg-background/95" key={card.href}>
        <CardHeader>
          <h2 className="text-xl font-semibold tracking-tight">{card.title}</h2>
          <CardDescription>{card.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            className="px-3 py-2 text-sm font-medium inline-flex rounded-md border transition-colors hover:bg-muted"
            to={card.href}
          >
            Open {card.title}
          </Link>
        </CardContent>
      </Card>
    ))}
  </div>
)

export { SettingsOverviewPage }
