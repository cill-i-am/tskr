import { resolveWorkspaceEntry } from "@/domains/workspaces/bootstrap/application/resolve-workspace-entry"
import { getWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client"
import { WorkspaceBootstrapProvider } from "@/domains/workspaces/bootstrap/ui/workspace-bootstrap-provider"
import {
  Outlet,
  createFileRoute,
  redirect,
  useLoaderData,
} from "@tanstack/react-router"

const OnboardingLayoutRoute = () => {
  const bootstrap = useLoaderData({ from: "/onboarding" })

  return (
    <WorkspaceBootstrapProvider bootstrap={bootstrap}>
      <Outlet />
    </WorkspaceBootstrapProvider>
  )
}

export const Route = createFileRoute("/onboarding")({
  component: OnboardingLayoutRoute,
  loader: async () => {
    const workspaceEntry = resolveWorkspaceEntry(await getWorkspaceBootstrap())

    if (workspaceEntry.state === "needs_auth") {
      throw redirect({
        replace: true,
        to: "/login",
      })
    }

    if (workspaceEntry.state === "enter_app") {
      throw redirect({
        replace: true,
        to: "/app",
      })
    }

    return workspaceEntry.bootstrap
  },
})
