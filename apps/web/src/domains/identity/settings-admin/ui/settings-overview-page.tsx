import { hasPeopleSettingsAccess } from "@/domains/identity/settings-admin/application/settings-route-access"
import type { SettingsAdminSnapshot } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { Link } from "@tanstack/react-router"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"

import { settingsStubPages } from "./settings-stub-pages"

interface SettingsOverviewPageProps {
  snapshot: SettingsAdminSnapshot
}

const isOverviewCard = (
  card: {
    description: string
    href: string
    title: string
  } | null
): card is {
  description: string
  href: string
  title: string
} => card !== null

const accountCards = (snapshot: SettingsAdminSnapshot) => [
  {
    description: `Signed in as ${snapshot.accountProfile.email}.`,
    href: "/app/settings/account",
    title: "Account",
  },
]

const realAdminCards = (snapshot: SettingsAdminSnapshot) =>
  [
    snapshot.permissions.canEditWorkspaceProfile
      ? {
          description: `Workspace profile: ${snapshot.workspaceProfile.name}.`,
          href: "/app/settings/workspace",
          title: "Workspace",
        }
      : null,
    hasPeopleSettingsAccess(snapshot.permissions)
      ? {
          description: `${snapshot.members.length} member records ready for admin management.`,
          href: "/app/settings/people",
          title: "People",
        }
      : null,
  ].filter(isOverviewCard)

const stubCards = settingsStubPages.map((page) => ({
  description: page.overviewDescription,
  href: page.to,
  title: page.title,
}))

const renderCards = (
  cards: { description: string; href: string; title: string }[]
) => (
  <div className="gap-4 md:grid-cols-2 xl:grid-cols-3 grid">
    {cards.map((card) => (
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

const SettingsOverviewPage = ({ snapshot }: SettingsOverviewPageProps) => {
  const adminCards = realAdminCards(snapshot)

  return (
    <div className="gap-6 flex flex-col">
      <section className="gap-4 flex flex-col">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Your settings
          </p>
        </div>
        {renderCards(accountCards(snapshot))}
      </section>
      {adminCards.length > 0 ? (
        <section className="gap-4 flex flex-col">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Available now
            </p>
          </div>
          {renderCards(adminCards)}
        </section>
      ) : null}
      <section className="gap-4 flex flex-col">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Coming soon
          </p>
        </div>
        {renderCards(stubCards)}
      </section>
    </div>
  )
}

export { SettingsOverviewPage }
