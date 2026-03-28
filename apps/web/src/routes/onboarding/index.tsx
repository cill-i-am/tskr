import { WorkspaceOnboardingPage } from "@/domains/workspaces/onboarding/ui/workspace-onboarding-page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/onboarding/")({
  component: WorkspaceOnboardingPage,
})
