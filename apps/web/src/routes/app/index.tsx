import { AppShellHomePage } from "@/domains/workspaces/app-shell/ui/app-shell-home-page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/app/")({
  component: AppShellHomePage,
})
