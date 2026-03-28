import { resolveWorkspaceEntry } from "@/domains/workspaces/bootstrap/application/resolve-workspace-entry"
import { getWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/infra/workspace-bootstrap-client"
import { createFileRoute, redirect } from "@tanstack/react-router"

const WorkspaceEntryPage = () => null

export const Route = createFileRoute("/")({
  component: WorkspaceEntryPage,
  loader: async () => {
    const workspaceEntry = resolveWorkspaceEntry(await getWorkspaceBootstrap())

    if (workspaceEntry.state === "needs_auth") {
      throw redirect({
        replace: true,
        to: "/login",
      })
    }

    throw redirect({
      replace: true,
      to: workspaceEntry.state === "enter_app" ? "/app" : "/onboarding",
    })
  },
})
