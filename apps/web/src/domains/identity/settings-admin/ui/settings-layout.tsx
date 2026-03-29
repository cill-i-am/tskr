import {
  hasPeopleSettingsAccess,
  hasWorkspaceAdminAccess,
} from "@/domains/identity/settings-admin/application/settings-route-access"
import type { SettingsAdminSnapshot } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { useWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/ui/use-workspace-bootstrap"
import { Link, useRouterState } from "@tanstack/react-router"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"

import { settingsStubPages } from "./settings-stub-pages"

interface SettingsLayoutProps {
  children: React.ReactNode
  snapshot: SettingsAdminSnapshot | null
}

const accountNavigationItems = [
  {
    description: "Update your profile and workspace-facing identity.",
    label: "Account",
    to: "/app/settings/account",
  },
]

const isNavigationItem = (
  item: {
    description: string
    label: string
    to: string
  } | null
): item is {
  description: string
  label: string
  to: string
} => item !== null

const getRealAdminItems = (snapshot: SettingsAdminSnapshot | null) => {
  if (!snapshot) {
    return []
  }

  return [
    snapshot.permissions.canEditWorkspaceProfile
      ? {
          description: "Control workspace name and profile details.",
          label: "Workspace",
          to: "/app/settings/workspace",
        }
      : null,
    hasPeopleSettingsAccess(snapshot.permissions)
      ? {
          description: "Manage roles, members, and invites.",
          label: "People",
          to: "/app/settings/people",
        }
      : null,
  ].filter(isNavigationItem)
}

const getStubItems = (snapshot: SettingsAdminSnapshot | null) => {
  if (!snapshot || !hasWorkspaceAdminAccess(snapshot.permissions)) {
    return []
  }

  return settingsStubPages.map((page) => ({
    description: page.navigationDescription,
    label: page.title,
    to: page.to,
  }))
}

const renderNavigationItem = (
  item: { description: string; label: string; to: string },
  pathname: string
) => {
  const isActive =
    pathname === item.to ||
    (item.to === "/app/settings/account" && pathname === "/app/settings")

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
      <span aria-hidden="true" className="text-xs block text-muted-foreground">
        {item.description}
      </span>
    </Link>
  )
}

const SettingsLayout = ({ children, snapshot }: SettingsLayoutProps) => {
  const { activeWorkspace } = useWorkspaceBootstrap()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const realAdminItems = getRealAdminItems(snapshot)
  const stubItems = getStubItems(snapshot)
  const summary =
    snapshot && hasWorkspaceAdminAccess(snapshot.permissions)
      ? `${snapshot.members.length} members in ${
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
          <div className="gap-2 flex flex-col">
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Your settings
            </p>
            {accountNavigationItems.map((item) =>
              renderNavigationItem(item, pathname)
            )}
          </div>
          {realAdminItems.length > 0 ? (
            <div className="gap-2 pt-2 flex flex-col border-t">
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Available now
              </p>
              {realAdminItems.map((item) =>
                renderNavigationItem(item, pathname)
              )}
            </div>
          ) : null}
          {stubItems.length > 0 ? (
            <div className="gap-2 pt-2 flex flex-col border-t">
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Coming soon
              </p>
              {stubItems.map((item) => renderNavigationItem(item, pathname))}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export { SettingsLayout }
