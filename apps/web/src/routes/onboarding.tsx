import { OnboardingGatePage } from "@/domains/workspaces/app-shell/ui/onboarding-gate-page"
import { resolveWorkspaceEntry } from "@/domains/workspaces/bootstrap/application/resolve-workspace-entry"
import { getWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client"
import { WorkspaceBootstrapProvider } from "@/domains/workspaces/bootstrap/ui/workspace-bootstrap-provider"
import {
  createFileRoute,
  redirect,
  useLoaderData,
} from "@tanstack/react-router"

const OnboardingRoutePage = () => {
  const bootstrap = useLoaderData({ from: "/onboarding" })

  return (
    <WorkspaceBootstrapProvider bootstrap={bootstrap}>
      <OnboardingGatePage />
    </WorkspaceBootstrapProvider>
  )
}

export const Route = createFileRoute("/onboarding")({
  component: OnboardingRoutePage,
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
