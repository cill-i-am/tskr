import type { SettingsAdminSnapshot } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { useWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/ui/use-workspace-bootstrap"
import { Link, useRouterState } from "@tanstack/react-router"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"

interface SettingsLayoutProps {
  children: React.ReactNode
  isAdmin: boolean
  snapshot: SettingsAdminSnapshot | null
}

const getNavigationItems = (isAdmin: boolean) => [
  {
    description: "Update your profile and workspace-facing identity.",
    label: "Account",
    to: "/app/settings/account",
  },
  ...(isAdmin
    ? [
        {
          description: "Control workspace name and profile details.",
          label: "Workspace",
          to: "/app/settings/workspace",
        },
        {
          description: "Manage roles, members, and invites.",
          label: "People",
          to: "/app/settings/people",
        },
        {
          description: "Stubbed labels settings surface.",
          label: "Labels",
          to: "/app/settings/labels",
        },
        {
          description: "Stubbed service zone settings surface.",
          label: "Service zones",
          to: "/app/settings/service-zones",
        },
        {
          description: "Stubbed notification settings surface.",
          label: "Notifications",
          to: "/app/settings/notifications",
        },
      ]
    : []),
]

const SettingsLayout = ({
  children,
  isAdmin,
  snapshot,
}: SettingsLayoutProps) => {
  const { activeWorkspace } = useWorkspaceBootstrap()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const navigationItems = getNavigationItems(isAdmin)
  const summary = isAdmin
    ? `${snapshot?.members.length ?? 0} members in ${
        activeWorkspace?.name ?? "this workspace"
      }.`
    : "Your account settings stay reachable without workspace admin access."

  return (
    <div className="gap-4 xl:grid-cols-[280px_minmax(0,1fr)] grid">
      <Card className="self-start bg-muted/40">
        <CardHeader>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Workspace settings
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <CardDescription>{summary}</CardDescription>
        </CardHeader>
        <CardContent className="gap-2 flex flex-col">
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.to ||
              (item.to === "/app/settings/account" &&
                pathname === "/app/settings")

            return (
              <Link
                aria-label={item.label}
                className={
                  isActive
                    ? "px-3 py-2 text-sm font-medium rounded-lg border bg-background text-foreground"
                    : "px-3 py-2 text-sm rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-background hover:text-foreground"
                }
                key={item.to}
                to={item.to}
              >
                <span className="block">{item.label}</span>
                <span
                  aria-hidden="true"
                  className="text-xs block text-muted-foreground"
                >
                  {item.description}
                </span>
              </Link>
            )
          })}
        </CardContent>
      </Card>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export { SettingsLayout }
