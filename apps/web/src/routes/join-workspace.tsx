import { JoinWorkspacePage } from "@/domains/workspaces/join-workspace/ui/join-workspace-page"
import { createFileRoute, useSearch } from "@tanstack/react-router"

export const validateJoinWorkspaceSearch = (
  search: Record<string, unknown>
) => ({
  token: typeof search.token === "string" ? search.token : undefined,
})

export const JoinWorkspaceRoute = () => {
  const search = useSearch({
    from: "/join-workspace",
  })

  return <JoinWorkspacePage token={search.token} />
}

export const Route = createFileRoute("/join-workspace")({
  component: JoinWorkspaceRoute,
  validateSearch: validateJoinWorkspaceSearch,
})
