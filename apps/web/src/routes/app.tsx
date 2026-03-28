import { AuthenticatedAppShell } from "@/domains/workspaces/app-shell/ui/authenticated-app-shell"
import { resolveWorkspaceEntry } from "@/domains/workspaces/bootstrap/application/resolve-workspace-entry"
import { getWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client"
import { WorkspaceBootstrapProvider } from "@/domains/workspaces/bootstrap/ui/workspace-bootstrap-provider"
import {
  Outlet,
  createFileRoute,
  redirect,
  useLoaderData,
} from "@tanstack/react-router"

const AppLayoutRoute = () => {
  const bootstrap = useLoaderData({ from: "/app" })

  return (
    <WorkspaceBootstrapProvider bootstrap={bootstrap}>
      <AuthenticatedAppShell>
        <Outlet />
      </AuthenticatedAppShell>
    </WorkspaceBootstrapProvider>
  )
}

export const Route = createFileRoute("/app")({
  component: AppLayoutRoute,
  loader: async () => {
    const workspaceEntry = resolveWorkspaceEntry(await getWorkspaceBootstrap())

    if (workspaceEntry.state === "needs_auth") {
      throw redirect({
        replace: true,
        to: "/login",
      })
    }

    if (workspaceEntry.state === "needs_onboarding") {
      throw redirect({
        replace: true,
        to: "/onboarding",
      })
    }

    return workspaceEntry.bootstrap
  },
})
