import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"

interface SettingsStubPageDefinition {
  body: string
  cardDescription: string
  navigationDescription: string
  overviewDescription: string
  title: string
  to: string
}

const settingsStubPages = [
  {
    body: "Labels settings are intentionally stubbed in this task.",
    cardDescription:
      "Placeholder route for future workspace label administration.",
    navigationDescription: "Stubbed labels settings surface.",
    overviewDescription:
      "Labels settings are scaffolded and ready for future forms.",
    title: "Labels",
    to: "/app/settings/labels",
  },
  {
    body: "Service zone settings are intentionally stubbed in this task.",
    cardDescription:
      "Placeholder route for future service zone administration.",
    navigationDescription: "Stubbed service zone settings surface.",
    overviewDescription:
      "Service zones currently expose a placeholder admin route.",
    title: "Service zones",
    to: "/app/settings/service-zones",
  },
  {
    body: "Notifications settings are intentionally stubbed in this task.",
    cardDescription:
      "Placeholder route for future workspace notification administration.",
    navigationDescription: "Stubbed notification settings surface.",
    overviewDescription:
      "Notification controls will attach to this shell next.",
    title: "Notifications",
    to: "/app/settings/notifications",
  },
] as const satisfies readonly SettingsStubPageDefinition[]

const SettingsStubPage = ({ page }: { page: SettingsStubPageDefinition }) => (
  <Card className="bg-background/95">
    <CardHeader>
      <h2 className="text-2xl font-semibold tracking-tight">{page.title}</h2>
      <CardDescription>{page.cardDescription}</CardDescription>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground">
      {page.body}
    </CardContent>
  </Card>
)

export { SettingsStubPage, settingsStubPages }
export type { SettingsStubPageDefinition }
